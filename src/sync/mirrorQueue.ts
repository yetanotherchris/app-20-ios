import type { SyncRemote } from './types'

export interface MirrorOperation {
  name: string
  revision: number
  content: string | null
}

export interface MirrorQueueStorage {
  read(): Promise<MirrorOperation[]>
  write(operations: readonly MirrorOperation[]): Promise<void>
}

export type MirrorQueueState = 'disabled' | 'idle' | 'pending' | 'syncing' | 'error'

/** Persists the latest object mutation before any remote work starts. */
export class MirrorQueue {
  private operations = new Map<string, MirrorOperation>()
  private active: Promise<void> | null = null
  private loaded = false

  constructor(
    private readonly storage: MirrorQueueStorage,
    private readonly remote: () => Promise<SyncRemote | null>,
    private readonly onState: (state: MirrorQueueState) => void,
  ) {}

  async schedule(operation: MirrorOperation): Promise<void> {
    await this.load()
    const existing = this.operations.get(operation.name)
    // Host counters restart with the app. A pending operation therefore defines
    // the next revision floor for its destination after relaunch.
    const revision = Math.max(operation.revision, (existing?.revision ?? 0) + 1)
    this.operations.set(operation.name, { ...operation, revision })
    await this.persist()
    this.onState('pending')
    void this.run()
  }

  async run(): Promise<void> {
    await this.load()
    if (this.active) return this.active
    this.active = this.flush().finally(() => {
      this.active = null
    })
    return this.active
  }

  async clear(): Promise<void> {
    await this.load()
    this.operations.clear()
    await this.persist()
    this.onState('disabled')
  }

  private async load(): Promise<void> {
    if (this.loaded) return
    for (const operation of await this.storage.read()) {
      const current = this.operations.get(operation.name)
      if (!current || current.revision < operation.revision) this.operations.set(operation.name, operation)
    }
    this.loaded = true
  }

  private async flush(): Promise<void> {
    const remote = await this.remote()
    if (!remote) {
      this.onState('disabled')
      return
    }
    if (this.operations.size === 0) {
      this.onState('idle')
      return
    }
    this.onState('syncing')
    try {
      // Drain until empty. Each pass re-reads the pending set, so a newer
      // revision that arrives while a send is in flight supersedes the older
      // one and is delivered without waiting for an unrelated user action
      // (spec 119 FR-022).
      while (true) {
        const pending = [...this.operations.values()].sort((a, b) => a.revision - b.revision)
        if (pending.length === 0) break
        for (const operation of pending) {
          if (operation.content === null) await remote.deleteText(operation.name)
          else await remote.writeText(operation.name, operation.content)
          const current = this.operations.get(operation.name)
          if (current?.revision === operation.revision) {
            this.operations.delete(operation.name)
            await this.persist()
          }
        }
      }
      this.onState('idle')
    } catch {
      // Pending operations stay persisted so an explicit retry or the next
      // resume can deliver them (FR-020).
      this.onState('error')
    }
  }

  private async persist(): Promise<void> {
    await this.storage.write([...this.operations.values()])
  }
}
