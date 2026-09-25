import { MANIFEST_FILE_NAME, MANIFEST_VERSION, isConversationFileName } from './constants'
import { uniqueConversationFileName } from './filename'
import {
  emptyManifest,
  entryFromConversation,
  parseManifestSafe,
  serializeManifest,
  sortManifestEntries,
  upsertManifestEntry,
  type ConversationManifest,
  type ManifestEntry,
} from './manifest'
import { parseConversationSafe, serializeConversation, type Conversation } from './schema'

/** Host-provided file access, keyed by bare file name. The host owns path safety. */
export interface ConversationFilePort {
  listFileNames(): Promise<string[]>
  readText(fileName: string): Promise<string>
  writeText(fileName: string, content: string): Promise<void>
  deleteText(fileName: string): Promise<void>
}

export interface ReconcileReport {
  dropped: number
  repaired: number
  corrupt: number
}

export type ConversationLoad = { kind: 'ok'; conversation: Conversation } | { kind: 'missing' } | { kind: 'corrupt' }

export interface ConversationListResult {
  entries: ManifestEntry[]
  report: ReconcileReport
}

export interface ConversationStore {
  list(): Promise<ConversationListResult>
  read(id: string): Promise<ConversationLoad>
  save(conversation: Conversation): Promise<{ fileName: string }>
  rename(id: string, title: string): Promise<Conversation>
  delete(id: string): Promise<void>
  clear(): Promise<void>
  reconcile(): Promise<ReconcileReport>
}

async function readManifest(port: ConversationFilePort): Promise<ConversationManifest> {
  try {
    return parseManifestSafe(await port.readText(MANIFEST_FILE_NAME)) ?? emptyManifest()
  } catch {
    return emptyManifest()
  }
}

async function tryReadConversation(port: ConversationFilePort, fileName: string): Promise<Conversation | null> {
  try {
    return parseConversationSafe(await port.readText(fileName))
  } catch {
    return null
  }
}

interface Reconciled {
  manifest: ConversationManifest
  report: ReconcileReport
}

async function reconcileWith(port: ConversationFilePort, manifest: ConversationManifest): Promise<Reconciled> {
  const fileNames = (await port.listFileNames()).filter(isConversationFileName)
  const present = new Set(fileNames)
  const kept: ManifestEntry[] = []
  let dropped = 0

  for (const entry of manifest.conversations) {
    if (present.has(entry.fileName)) kept.push(entry)
    else dropped += 1
  }

  const referenced = new Set(kept.map((entry) => entry.fileName))
  let repaired = 0
  let corrupt = 0

  for (const fileName of fileNames) {
    if (referenced.has(fileName)) continue
    const conversation = await tryReadConversation(port, fileName)
    if (conversation) {
      kept.push(entryFromConversation(conversation, fileName))
      referenced.add(fileName)
      repaired += 1
    } else {
      corrupt += 1
    }
  }

  return {
    manifest: { version: MANIFEST_VERSION, conversations: sortManifestEntries(kept) },
    report: { dropped, repaired, corrupt },
  }
}

export function createConversationStore(port: ConversationFilePort): ConversationStore {
  async function list(): Promise<ConversationListResult> {
    const reconciled = await reconcileWith(port, await readManifest(port))
    if (reconciled.report.dropped > 0 || reconciled.report.repaired > 0) {
      await port.writeText(MANIFEST_FILE_NAME, serializeManifest(reconciled.manifest))
    }
    return { entries: reconciled.manifest.conversations, report: reconciled.report }
  }

  async function read(id: string): Promise<ConversationLoad> {
    // Reconcile first so a stale manifest cannot hide a conversation that exists
    // on disk (for example after a repair or a device sync).
    const { entries } = await list()
    const entry = entries.find((candidate) => candidate.id === id)
    if (!entry) return { kind: 'missing' }

    let content: string
    try {
      content = await port.readText(entry.fileName)
    } catch {
      return { kind: 'missing' }
    }

    const conversation = parseConversationSafe(content)
    return conversation ? { kind: 'ok', conversation } : { kind: 'corrupt' }
  }

  async function save(conversation: Conversation): Promise<{ fileName: string }> {
    const manifest = await readManifest(port)
    const existing = manifest.conversations.find((entry) => entry.id === conversation.id)
    const existingNames = await port.listFileNames()
    const reuseExisting =
      existing !== undefined && isConversationFileName(existing.fileName) && existingNames.includes(existing.fileName)
    const fileName = reuseExisting ? existing.fileName : uniqueConversationFileName(conversation.id, existingNames)

    await port.writeText(fileName, serializeConversation(conversation))
    const updated = upsertManifestEntry(manifest, entryFromConversation(conversation, fileName))
    await port.writeText(MANIFEST_FILE_NAME, serializeManifest(updated))
    return { fileName }
  }

  async function rename(id: string, title: string): Promise<Conversation> {
    const trimmedTitle = title.trim()
    if (trimmedTitle.length === 0 || trimmedTitle.length > 80) {
      throw new Error('Conversation title must contain between 1 and 80 characters')
    }

    const loaded = await read(id)
    if (loaded.kind !== 'ok') throw new Error('Conversation is unavailable')

    // Renaming changes presentation, not message activity. Keep its list position stable.
    const renamed = { ...loaded.conversation, title: trimmedTitle }
    await save(renamed)
    return renamed
  }

  async function deleteConversation(id: string): Promise<void> {
    const manifest = await readManifest(port)
    const entry = manifest.conversations.find((candidate) => candidate.id === id)
    if (!entry) throw new Error('Conversation is unavailable')

    const nextManifest = {
      ...manifest,
      conversations: manifest.conversations.filter((candidate) => candidate.id !== id),
    }
    await port.writeText(MANIFEST_FILE_NAME, serializeManifest(nextManifest))
    try {
      await port.deleteText(entry.fileName)
    } catch (error) {
      await port.writeText(MANIFEST_FILE_NAME, serializeManifest(manifest))
      throw error
    }
  }

  async function clear(): Promise<void> {
    const fileNames = await port.listFileNames()
    const deletableNames = fileNames.filter(
      (fileName) => fileName === MANIFEST_FILE_NAME || isConversationFileName(fileName),
    )
    await Promise.all(deletableNames.map((fileName) => port.deleteText(fileName)))
  }

  async function reconcile(): Promise<ReconcileReport> {
    return (await list()).report
  }

  return { list, read, save, rename, delete: deleteConversation, clear, reconcile }
}
