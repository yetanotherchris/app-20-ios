import { MANIFEST_VERSION, isConversationFileName } from './constants'
import { isRecord } from './guards'
import type { Conversation } from './schema'

export interface ManifestEntry {
  id: string
  fileName: string
  title: string
  model: string
  updatedAt: string
}

export interface ConversationManifest {
  version: 1
  conversations: ManifestEntry[]
}

export function emptyManifest(): ConversationManifest {
  return { version: MANIFEST_VERSION, conversations: [] }
}

function parseEntry(value: unknown): ManifestEntry | null {
  if (!isRecord(value)) return null
  const { id, fileName, title, model, updatedAt } = value
  if (typeof id !== 'string' || typeof fileName !== 'string' || typeof title !== 'string') {
    return null
  }
  if (typeof model !== 'string' || typeof updatedAt !== 'string') return null
  if (!isConversationFileName(fileName)) return null
  return { id, fileName, title, model, updatedAt }
}

/**
 * A manifest that is malformed, has a duplicate id or file name, or references a
 * reserved/unsafe file name is treated as absent so the store rebuilds it from
 * the conversation files rather than trusting it.
 */
export function parseManifest(value: unknown): ConversationManifest | null {
  if (!isRecord(value)) return null
  const { conversations } = value
  if (!Array.isArray(conversations)) return null

  const entries: ManifestEntry[] = []
  const ids = new Set<string>()
  const fileNames = new Set<string>()
  for (const entry of conversations) {
    const parsed = parseEntry(entry)
    if (!parsed) return null
    if (ids.has(parsed.id) || fileNames.has(parsed.fileName)) return null
    ids.add(parsed.id)
    fileNames.add(parsed.fileName)
    entries.push(parsed)
  }
  return { version: MANIFEST_VERSION, conversations: entries }
}

export function parseManifestSafe(content: string): ConversationManifest | null {
  try {
    return parseManifest(JSON.parse(content))
  } catch {
    return null
  }
}

export function serializeManifest(manifest: ConversationManifest): string {
  const conversations = manifest.conversations.map((entry) => ({
    id: entry.id,
    fileName: entry.fileName,
    title: entry.title,
    model: entry.model,
    updatedAt: entry.updatedAt,
  }))
  return JSON.stringify({ version: MANIFEST_VERSION, conversations }, null, 2)
}

export function sortManifestEntries(entries: readonly ManifestEntry[]): ManifestEntry[] {
  return [...entries].sort((a, b) => {
    if (a.updatedAt !== b.updatedAt) return a.updatedAt < b.updatedAt ? 1 : -1
    if (a.id !== b.id) return a.id < b.id ? -1 : 1
    return 0
  })
}

export function upsertManifestEntry(manifest: ConversationManifest, entry: ManifestEntry): ConversationManifest {
  const conversations = manifest.conversations.filter((existing) => existing.id !== entry.id)
  conversations.push(entry)
  return { version: MANIFEST_VERSION, conversations: sortManifestEntries(conversations) }
}

export function entryFromConversation(conversation: Conversation, fileName: string): ManifestEntry {
  return {
    id: conversation.id,
    fileName,
    title: conversation.title,
    model: conversation.model,
    updatedAt: conversation.updatedAt,
  }
}
