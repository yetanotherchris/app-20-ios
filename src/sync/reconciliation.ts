import { Sha256 } from '@aws-crypto/sha256-js'
import {
  MANIFEST_FILE_NAME,
  entryFromConversation,
  isConversationFileName,
  parseManifestSafe,
  serializeConversation,
  serializeManifest,
  sortManifestEntries,
  type Conversation,
  type ConversationFilePort,
  type ManifestEntry,
} from '../storage'
import type { S3Config } from '../secrets/secretService'
import type { MirrorOperation, MirrorQueueState } from './mirrorQueue'
import type { SyncRemote, SyncReport } from './types'
import { RemoteMissingError } from './errors'
import { compareInstants, equivalent, freshTimestamp, instant, revision } from './revision'

export interface RemoteRevision {
  text: string | null
  bytes?: number[]
}
export interface SyncHold {
  destination: string
  token: string
  name: string
  kind: 'conflict' | 'malformed' | 'local-corrupt' | 'legacy-delete'
  remote: RemoteRevision
  baseline: string | null
}
export interface DeferredRevision {
  name: string
  baseline: string | null
  remote: RemoteRevision
}
export interface RecoveryRevision {
  destination: string
  name: string
  text: string | null
  bytes?: number[]
}
export interface PendingRevision extends MirrorOperation {
  replacement?: RemoteRevision
}
export interface ReconciliationState {
  version: 1
  destination: string
  operations: PendingRevision[]
  holds: SyncHold[]
  deferred: DeferredRevision[]
  recovery: RecoveryRevision[]
  legacyDeletes: string[]
}
export interface ReconciliationStorage {
  read(): Promise<ReconciliationState | null>
  write(value: ReconciliationState): Promise<void>
}
export interface ReconciliationOptions {
  local: ConversationFilePort
  storage: ReconciliationStorage
  config(): Promise<S3Config | null>
  remote(config: S3Config): SyncRemote
  legacyOperations?(): Promise<MirrorOperation[]>
  isActive?(name: string, conversation: Conversation | null): boolean
  onApplied?(name: string, conversation: Conversation): void
  onHistory?(): Promise<void> | void
  onState?(state: MirrorQueueState, phase: 'history' | 'upload'): void
  onHolds?(holds: SyncHold[]): void
}

const emptyState = (): ReconciliationState => ({
  version: 1,
  destination: '',
  operations: [],
  holds: [],
  deferred: [],
  recovery: [],
  legacyDeletes: [],
})
class ObsoleteConfiguration extends Error {}
function structuredCopy(value: ReconciliationState): ReconciliationState {
  return JSON.parse(JSON.stringify(value)) as ReconciliationState
}

async function identity(config: S3Config): Promise<string> {
  const hash = new Sha256()
  hash.update(
    JSON.stringify([config.bucket, config.region, config.endpoint ?? '', config.accessKeyId, config.secretAccessKey]),
  )
  return Array.from(await hash.digest(), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** Serializes network work separately from short local commit/application sections. */
export class ReconciliationCoordinator {
  private data = emptyState()
  private loaded = false
  private committed = emptyState()
  private localTail: Promise<unknown> = Promise.resolve()
  private running: Promise<void> | null = null
  private again = false
  private epoch = 0
  private initialized = false
  private remote: SyncRemote | null = null
  private current: MirrorQueueState = 'disabled'
  private phase: 'history' | 'upload' = 'history'
  private lastReport: SyncReport = { uploaded: 0, downloaded: 0, skipped: 0, manifestUploaded: false }

  constructor(private readonly options: ReconciliationOptions) {}
  state(): MirrorQueueState {
    return this.current
  }
  holds(): SyncHold[] {
    return this.data.holds.map((hold) => ({ ...hold }))
  }
  report(): SyncReport {
    return this.lastReport
  }

  /** The host must use this for canonical saves/deletes and live-state changes. */
  localMutation<T>(work: () => Promise<T>): Promise<T> {
    const next = this.localTail.catch(() => undefined).then(work)
    this.localTail = next
    return next
  }

  configurationChanged(): Promise<void> {
    this.epoch += 1 // Invalidate obsolete remote results synchronously, before reading settings.
    this.initialized = false
    this.remote = null
    this.again = true
    return this.run()
  }

  async clear(): Promise<void> {
    await this.configurationChanged()
  }

  async deleteLocally(name: string, work: () => Promise<void>): Promise<void> {
    await this.configure()
    const epoch = this.epoch
    await this.localMutation(async () => {
      this.check(epoch)
      const previous = [...this.data.operations]
      if (this.remote) {
        this.recover(name, { text: await this.localRead(name) })
        this.data.operations = this.data.operations.filter((op) => op.name !== name)
        this.data.operations.push({ name, revision: Date.now(), content: null })
        await this.persist(epoch)
      }
      try {
        await work()
      } catch (error) {
        this.data.operations = previous
        if (this.remote) await this.persist(epoch)
        throw error
      }
      this.check(epoch)
    })
    void this.run()
  }

  async schedule(operation: MirrorOperation): Promise<void> {
    await this.configure()
    if (!this.remote) return
    const epoch = this.epoch
    await this.localMutation(async () => {
      this.check(epoch)
      if (operation.name !== MANIFEST_FILE_NAME && !isConversationFileName(operation.name))
        throw new Error('Invalid sync filename')
      const previous = this.data.operations.find((item) => item.name === operation.name)
      this.data.operations = this.data.operations.filter((item) => item.name !== operation.name)
      this.data.operations.push({ ...operation, revision: Math.max(operation.revision, (previous?.revision ?? 0) + 1) })
      await this.persist(epoch)
    })
    this.setState('pending')
    void this.run()
  }

  run(): Promise<void> {
    if (this.running) {
      this.again = true
      return this.running
    }
    this.running = this.drain().finally(() => {
      this.running = null
    })
    return this.running
  }

  private async configure(): Promise<void> {
    while (true) {
      try {
        await this.configureOnce()
        return
      } catch (error) {
        if (!(error instanceof ObsoleteConfiguration)) throw error
      }
    }
  }

  private async configureOnce(): Promise<void> {
    const observed = this.epoch
    const config = await this.options.config()
    const destination = config ? await identity(config) : ''
    await this.localMutation(async () => {
      if (observed !== this.epoch) throw new ObsoleteConfiguration()
      if (!this.loaded) {
        this.data = (await this.options.storage.read()) ?? emptyState()
        if (!this.data.destination && this.options.legacyOperations) {
          const legacy = await this.options.legacyOperations()
          this.data.legacyDeletes = [
            ...new Set([
              ...this.data.legacyDeletes,
              ...legacy.filter((op) => op.content === null && isConversationFileName(op.name)).map((op) => op.name),
            ]),
          ]
        }
        this.committed = structuredCopy(this.data)
        this.loaded = true
      }
      if (destination !== this.data.destination) {
        this.initialized = false
        this.epoch += 1
        for (const hold of this.data.holds) this.recover(hold.name, hold.remote)
        for (const candidate of this.data.deferred) this.recover(candidate.name, candidate.remote)
        this.data.operations = []
        this.data.holds = []
        this.data.deferred = []
        this.data.destination = destination
        await this.persist(this.epoch)
      }
      if (!this.initialized) {
        this.remote = config ? this.options.remote(config) : null
        this.initialized = true
      }
      this.options.onHolds?.(this.holds())
    })
  }

  private async drain(): Promise<void> {
    do {
      this.again = false
      this.phase = 'history'
      try {
        await this.configure()
        if (!this.remote) {
          this.setState('disabled')
          continue
        }
        const epoch = this.epoch,
          remote = this.remote
        this.setState('syncing')
        await this.reconcile(remote, epoch)
        this.check(epoch)
        this.setState(this.data.holds.length || this.data.deferred.length ? 'pending' : 'idle')
      } catch (error) {
        if (error instanceof ObsoleteConfiguration) this.again = true
        else this.setState('error')
      }
    } while (this.again)
  }

  private check(epoch: number): void {
    if (epoch !== this.epoch) throw new ObsoleteConfiguration()
  }
  private setState(state: MirrorQueueState): void {
    this.current = state
    this.options.onState?.(state, this.phase)
  }
  private async persist(epoch: number): Promise<void> {
    this.check(epoch)
    try {
      await this.options.storage.write(structuredCopy(this.data))
      this.committed = structuredCopy(this.data)
    } catch (error) {
      this.data = structuredCopy(this.committed)
      throw error
    }
    this.check(epoch)
    this.options.onHolds?.(this.holds())
  }
  private recover(name: string, value: RemoteRevision): void {
    if (value.text === null && !value.bytes) return
    this.data.recovery.push({ destination: this.data.destination, name, ...value })
  }
  private async localRead(name: string): Promise<string | null> {
    // Listing establishes absence; failures on a present file must fail closed.
    if (!(await this.options.local.listFileNames()).includes(name)) return null
    return this.options.local.readText(name)
  }
  private async remoteRead(remote: SyncRemote, name: string, epoch: number): Promise<RemoteRevision> {
    this.check(epoch)
    try {
      const result = remote.readRevision ? await remote.readRevision(name) : { text: await remote.readText(name) }
      this.check(epoch)
      return result
    } catch (error) {
      this.check(epoch)
      if (error instanceof RemoteMissingError) return { text: null }
      throw error
    }
  }
  private active(name: string, raw: string | null): boolean {
    return this.options.isActive?.(name, revision(raw)) ?? false
  }
  private async hold(
    name: string,
    kind: SyncHold['kind'],
    remote: RemoteRevision,
    baseline: string | null,
    epoch: number,
  ): Promise<void> {
    this.data.holds = this.data.holds.filter((item) => item.name !== name)
    this.data.holds.push({
      name,
      kind,
      remote,
      baseline,
      destination: this.data.destination,
      token: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    })
    this.data.deferred = this.data.deferred.filter((item) => item.name !== name)
    await this.persist(epoch)
  }

  private async reconcile(remote: SyncRemote, epoch: number): Promise<void> {
    const report: SyncReport = { uploaded: 0, downloaded: 0, skipped: 0, manifestUploaded: false }
    const names = await remote.listNames()
    this.check(epoch)
    const manifestValue = await this.remoteRead(remote, MANIFEST_FILE_NAME, epoch)
    const remoteManifest = manifestValue.text === null ? null : parseManifestSafe(manifestValue.text)
    const remoteEntries = new Map(
      (remoteManifest?.conversations ?? [])
        .filter((entry) => isConversationFileName(entry.fileName))
        .map((entry) => [entry.fileName, entry]),
    )
    const localNames = await this.options.local.listFileNames()
    this.check(epoch)
    const all = [
      ...new Set([
        ...names,
        ...localNames,
        ...remoteEntries.keys(),
        ...this.data.operations.map((op) => op.name),
        ...this.data.deferred.map((item) => item.name),
      ]),
    ]
      .filter(isConversationFileName)
      .sort()
    report.skipped += names.filter((name) => name !== MANIFEST_FILE_NAME && !isConversationFileName(name)).length
    for (const name of all) {
      this.phase = 'history'
      let baseline: string | null = null
      let wasActive = false
      await this.localMutation(async () => {
        this.check(epoch)
        baseline = await this.localRead(name)
        wasActive = this.active(name, baseline)
      })
      const candidate = await this.remoteRead(remote, name, epoch)
      let upload: string | null | undefined
      let deleted = false
      await this.localMutation(async () => {
        this.check(epoch)
        const fresh = await this.localRead(name)
        const local = revision(fresh),
          other = revision(candidate.text)
        const pendingDelete = this.data.operations.some((op) => op.name === name && op.content === null)
        if (pendingDelete && fresh !== null) {
          // A crash or failed local deletion cannot authorize deletion of the remote copy.
          this.data.operations = this.data.operations.filter((op) => op.name !== name)
          await this.persist(epoch)
          this.again = true
          return
        }
        if (pendingDelete) {
          this.recover(name, candidate)
          for (const hold of this.data.holds.filter((item) => item.name === name)) this.recover(name, hold.remote)
          this.data.holds = this.data.holds.filter((item) => item.name !== name)
          this.data.deferred = this.data.deferred.filter((item) => item.name !== name)
          await this.persist(epoch)
          upload = null
          deleted = true
          return
        }
        if (this.data.legacyDeletes.includes(name)) {
          await this.hold(name, 'legacy-delete', candidate, fresh, epoch)
          report.skipped += 1
          return
        }
        if (this.data.holds.some((item) => item.name === name)) {
          report.skipped += 1
          return
        }
        if (fresh !== null && !local) {
          await this.hold(name, 'local-corrupt', candidate, fresh, epoch)
          report.skipped += 1
          return
        }
        const authorized = this.data.operations.find((op) => op.name === name)?.replacement
        if (authorized) {
          if (JSON.stringify(authorized) !== JSON.stringify(candidate)) {
            await this.hold(name, other ? 'conflict' : 'malformed', candidate, fresh, epoch)
            report.skipped += 1
            return
          }
          if (local) {
            upload = fresh!
            return
          }
        }
        if (candidate.text !== null && !other) {
          await this.hold(name, 'malformed', candidate, fresh, epoch)
          report.skipped += 1
          return
        }
        const deferred = this.data.deferred.find((item) => item.name === name)
        if (deferred && !equivalent(deferred.baseline, fresh)) {
          await this.hold(name, 'conflict', candidate, fresh, epoch)
          report.skipped += 1
          return
        }
        if (!equivalent(baseline, fresh) && candidate.text !== null && !equivalent(fresh, candidate.text)) {
          await this.hold(name, 'conflict', candidate, fresh, epoch)
          report.skipped += 1
          return
        }
        if (other && (!local || compareInstants(instant(other.updatedAt)!, instant(local.updatedAt)!) > 0)) {
          if (wasActive || this.active(name, fresh)) {
            this.data.deferred = this.data.deferred.filter((item) => item.name !== name)
            this.data.deferred.push({ name, baseline: deferred?.baseline ?? baseline, remote: candidate })
            await this.persist(epoch)
            if (!this.active(name, fresh)) this.again = true
            return
          }
          this.recover(name, { text: fresh })
          this.data.deferred = this.data.deferred.filter((item) => item.name !== name)
          // Recovery/deferral protection is committed before changing the canonical file.
          await this.persist(epoch)
          await this.options.local.writeText(name, candidate.text!)
          this.check(epoch)
          this.options.onApplied?.(name, other)
          report.downloaded += 1
          remoteEntries.set(name, entryFromConversation(other, name))
        } else if (
          local &&
          other &&
          compareInstants(instant(local.updatedAt)!, instant(other.updatedAt)!) === 0 &&
          !equivalent(fresh, candidate.text)
        ) {
          await this.hold(name, 'conflict', candidate, fresh, epoch)
          report.skipped += 1
          return
        } else if (local && (!other || compareInstants(instant(local.updatedAt)!, instant(other.updatedAt)!) > 0)) {
          upload = fresh!
        } else if (other) remoteEntries.set(name, entryFromConversation(other, name))
        if (deferred && !this.active(name, fresh))
          this.data.deferred = this.data.deferred.filter((item) => item.name !== name)
      })
      if (upload !== undefined) {
        this.phase = 'upload'
        this.check(epoch)
        if (upload === null) await remote.deleteText(name)
        else await remote.writeText(name, upload)
        this.check(epoch)
        if (deleted) remoteEntries.delete(name)
        else {
          remoteEntries.set(name, entryFromConversation(revision(upload)!, name))
          report.uploaded += 1
        }
      }
      await this.localMutation(async () => {
        this.check(epoch)
        if (this.data.holds.some((item) => item.name === name) || this.data.deferred.some((item) => item.name === name))
          return
        const now = await this.localRead(name)
        if (upload !== undefined && !equivalent(now, upload)) {
          this.again = true
          return
        }
        this.data.operations = this.data.operations.filter((op) => op.name !== name)
        await this.persist(epoch)
      })
    }
    // Build local metadata under the same coordination as saves and accepted downloads.
    await this.localMutation(async () => {
      this.check(epoch)
      const entries: ManifestEntry[] = []
      for (const name of (await this.options.local.listFileNames()).filter(isConversationFileName)) {
        const value = revision(await this.options.local.readText(name))
        if (value) entries.push(entryFromConversation(value, name))
      }
      const serialized = serializeManifest({ version: 1, conversations: sortManifestEntries(entries) })
      if ((await this.localRead(MANIFEST_FILE_NAME)) !== serialized)
        await this.options.local.writeText(MANIFEST_FILE_NAME, serialized)
      this.check(epoch)
    })
    const serializedRemote = serializeManifest({
      version: 1,
      conversations: sortManifestEntries([...remoteEntries.values()]),
    })
    if (manifestValue.text !== serializedRemote) {
      this.phase = 'upload'
      this.check(epoch)
      await remote.writeText(MANIFEST_FILE_NAME, serializedRemote)
      this.check(epoch)
      report.manifestUploaded = true
    }
    await this.localMutation(async () => {
      this.check(epoch)
      this.data.operations = this.data.operations.filter((op) => op.name !== MANIFEST_FILE_NAME)
      await this.persist(epoch)
    })
    this.lastReport = report
    this.check(epoch)
    await this.localMutation(async () => {
      this.check(epoch)
      await this.options.onHistory?.()
      this.check(epoch)
    })
  }

  /** A presented hold is a choice token: remote changes require another user choice. */
  async resolve(
    name: string,
    choice: 'local' | 'remote',
    presented: SyncHold,
  ): Promise<'resolved' | 'changed' | 'busy'> {
    await this.configure()
    const epoch = this.epoch,
      remote = this.remote
    if (!remote) return 'changed'
    const candidate = await this.remoteRead(remote, name, epoch)
    const result: { outcome: 'resolved' | 'changed' | 'busy' } = { outcome: 'changed' }
    await this.localMutation(async () => {
      this.check(epoch)
      const hold = this.data.holds.find((item) => item.name === name)
      if (
        !hold ||
        hold.token !== presented.token ||
        hold.destination !== presented.destination ||
        presented.destination !== this.data.destination
      )
        return
      const localRaw = await this.localRead(name),
        local = revision(localRaw)
      if (this.active(name, localRaw)) {
        result.outcome = 'busy'
        return
      }
      if (JSON.stringify(candidate) !== JSON.stringify(presented.remote)) {
        await this.hold(name, hold.kind, candidate, localRaw, epoch)
        return
      }
      const other = revision(candidate.text)
      const chosen = choice === 'local' ? local : other
      if (hold.kind !== 'legacy-delete' && !chosen) return
      this.recover(name, { text: localRaw })
      this.recover(name, candidate)
      if (hold.kind === 'legacy-delete' && choice === 'local') {
        this.data.operations = this.data.operations.filter((op) => op.name !== name)
        this.data.operations.push({ name, revision: Date.now(), content: null })
        await this.persist(epoch)
      } else if (chosen) {
        const resolved = { ...chosen, updatedAt: freshTimestamp(local?.updatedAt ?? '', other?.updatedAt ?? '') }
        const content = serializeConversation(resolved)
        // Keep the hold until local commit and durable queue replacement both succeed.
        await this.persist(epoch)
        await this.options.local.writeText(name, content)
        this.check(epoch)
        this.options.onApplied?.(name, resolved)
        this.data.operations = this.data.operations.filter((op) => op.name !== name)
        this.data.operations.push({ name, revision: Date.now(), content, replacement: candidate })
      } else return
      this.data.holds = this.data.holds.filter((item) => item.name !== name)
      this.data.deferred = this.data.deferred.filter((item) => item.name !== name)
      this.data.legacyDeletes = this.data.legacyDeletes.filter((item) => item !== name)
      await this.persist(epoch)
      result.outcome = 'resolved'
    })
    if (result.outcome === 'resolved') await this.run()
    return result.outcome
  }
}
