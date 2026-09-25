import {
  MANIFEST_FILE_NAME,
  MANIFEST_VERSION,
  entryFromConversation,
  isConversationFileName,
  parseConversationSafe,
  parseManifestSafe,
  serializeManifest,
  sortManifestEntries,
  type Conversation,
  type ConversationFilePort,
  type ConversationManifest,
  type ManifestEntry,
} from '../storage'
import { RemoteMissingError } from './errors'
import type { SyncRemote, SyncReport } from './types'

interface Side {
  raw: string | null
  conversation: Conversation | null
}

function readSide(raw: string | null): Side {
  return { raw, conversation: raw === null ? null : parseConversationSafe(raw) }
}

/**
 * Reads a remote object, treating absence as `null` and any other failure as an
 * abort. A transient network error must not look like a missing object, or the
 * engine could overwrite it with a local copy.
 */
async function readRemote(remote: SyncRemote, name: string): Promise<string | null> {
  try {
    return await remote.readText(name)
  } catch (error) {
    if (error instanceof RemoteMissingError) return null
    throw error
  }
}

/** Local reads treat any failure as missing; the host owns local error policy. */
async function readLocal(local: ConversationFilePort, name: string): Promise<string | null> {
  try {
    return await local.readText(name)
  } catch {
    return null
  }
}

function manifestNames(raw: string | null): string[] {
  if (raw === null) return []
  const manifest = parseManifestSafe(raw)
  if (!manifest) return []
  return manifest.conversations.map((entry) => entry.fileName)
}

async function buildManifest(local: ConversationFilePort): Promise<ConversationManifest> {
  const names = (await local.listFileNames()).filter(isConversationFileName)
  const entries: ManifestEntry[] = []
  for (const name of names) {
    let raw: string
    try {
      raw = await local.readText(name)
    } catch {
      continue
    }
    const conversation = parseConversationSafe(raw)
    if (!conversation) continue
    entries.push(entryFromConversation(conversation, name))
  }
  return { version: MANIFEST_VERSION, conversations: sortManifestEntries(entries) }
}

/**
 * Reconciles the local conversation folder with the remote store using
 * last-write-wins on the conversation `updatedAt` (FR-004). Bytes are moved
 * without conversion (FR-008); a remote object that is absent, empty, or
 * unparseable is never treated as valid (FR-006); a locally deleted
 * conversation is downloaded again because deletions do not propagate (FR-009);
 * a corrupt local file is left untouched so no local content is destroyed.
 */
export async function syncOnce(local: ConversationFilePort, remote: SyncRemote): Promise<SyncReport> {
  const localNameSet = new Set((await local.listFileNames()).filter(isConversationFileName))
  const remoteAllNames = await remote.listNames()
  const remoteNameSet = new Set(remoteAllNames.filter(isConversationFileName))
  const remoteManifestRaw = remoteAllNames.includes(MANIFEST_FILE_NAME)
    ? await readRemote(remote, MANIFEST_FILE_NAME)
    : null

  const indexed = new Set(manifestNames(remoteManifestRaw).filter(isConversationFileName))
  const names = [...new Set([...localNameSet, ...remoteNameSet, ...indexed])].sort()

  let uploaded = 0
  let downloaded = 0
  let skipped = 0

  for (const name of names) {
    const localRaw = localNameSet.has(name) ? await local.readText(name) : null
    const remoteExists = remoteNameSet.has(name) || indexed.has(name)
    const remoteRaw = remoteExists ? await readRemote(remote, name) : null
    const localSide = readSide(localRaw)
    const remoteSide = readSide(remoteRaw)

    if (localSide.conversation && localRaw !== null && !remoteSide.conversation) {
      // Includes repairing a corrupt or empty remote object from a valid local copy.
      await remote.writeText(name, localRaw)
      uploaded += 1
      if (remoteRaw !== null) skipped += 1
      continue
    }
    if (!localSide.conversation && remoteSide.conversation && remoteRaw !== null) {
      if (localRaw !== null) {
        // A corrupt local file is never overwritten or deleted (constitution III).
        skipped += 1
        continue
      }
      // A save may have landed after the listing; do not clobber a newer local copy.
      const fresh = readSide(await readLocal(local, name))
      if (fresh.conversation && fresh.conversation.updatedAt >= remoteSide.conversation.updatedAt) {
        continue
      }
      await local.writeText(name, remoteRaw)
      downloaded += 1
      continue
    }
    if (localSide.conversation && localRaw !== null && remoteSide.conversation) {
      if (remoteSide.conversation.updatedAt > localSide.conversation.updatedAt) {
        // Re-read before overwriting so a concurrent save is not lost to an
        // older remote copy (last-write-wins must hold across save and sync).
        const fresh = readSide(await readLocal(local, name))
        if (fresh.conversation && fresh.conversation.updatedAt >= remoteSide.conversation.updatedAt) {
          continue
        }
        if (remoteRaw !== null) await local.writeText(name, remoteRaw)
        downloaded += 1
      } else if (localSide.conversation.updatedAt > remoteSide.conversation.updatedAt) {
        await remote.writeText(name, localRaw)
        uploaded += 1
      }
      continue
    }
    // Neither side parses as a conversation: report and move on without touching either file.
    if (localSide.raw !== null || remoteSide.raw !== null) skipped += 1
  }

  const serialized = serializeManifest(await buildManifest(local))
  if ((await readLocalManifest(local)) !== serialized) {
    await local.writeText(MANIFEST_FILE_NAME, serialized)
  }

  let manifestUploaded = false
  if (remoteManifestRaw !== serialized) {
    await remote.writeText(MANIFEST_FILE_NAME, serialized)
    manifestUploaded = true
  }

  return { uploaded, downloaded, skipped, manifestUploaded }
}

async function readLocalManifest(local: ConversationFilePort): Promise<string | null> {
  try {
    return await local.readText(MANIFEST_FILE_NAME)
  } catch {
    return null
  }
}
