import { Directory, File, Paths } from 'expo-file-system'
import { isConversationFileName, MANIFEST_FILE_NAME } from '../storage/constants'
import type { ReconciliationState, ReconciliationStorage } from './reconciliation'

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}
function text(value: unknown): boolean {
  return value === null || typeof value === 'string'
}
function remote(value: unknown): boolean {
  return (
    record(value) &&
    text(value.text) &&
    (value.bytes === undefined ||
      (Array.isArray(value.bytes) && value.bytes.every((byte) => Number.isInteger(byte) && byte >= 0 && byte <= 255)))
  )
}
function safeName(value: unknown): value is string {
  return typeof value === 'string' && isConversationFileName(value)
}

/** Fail closed on damaged state rather than silently dropping delete/hold protection. */
export function parseReconciliationState(value: unknown): ReconciliationState {
  if (
    !record(value) ||
    value.version !== 1 ||
    typeof value.destination !== 'string' ||
    !Array.isArray(value.operations) ||
    !Array.isArray(value.holds) ||
    !Array.isArray(value.deferred) ||
    !Array.isArray(value.recovery) ||
    !Array.isArray(value.legacyDeletes)
  )
    throw new Error('Sync recovery state could not be loaded.')
  if (
    !value.operations.every(
      (op) =>
        record(op) &&
        (safeName(op.name) || op.name === MANIFEST_FILE_NAME) &&
        typeof op.revision === 'number' &&
        Number.isFinite(op.revision) &&
        text(op.content) &&
        (op.replacement === undefined || remote(op.replacement)),
    )
  )
    throw new Error('Sync recovery state could not be loaded.')
  if (
    !value.holds.every(
      (hold) =>
        record(hold) &&
        safeName(hold.name) &&
        ['conflict', 'malformed', 'local-corrupt', 'legacy-delete'].includes(String(hold.kind)) &&
        typeof hold.token === 'string' &&
        hold.destination === value.destination &&
        text(hold.baseline) &&
        remote(hold.remote),
    )
  )
    throw new Error('Sync recovery state could not be loaded.')
  if (
    !value.deferred.every((item) => record(item) && safeName(item.name) && text(item.baseline) && remote(item.remote))
  )
    throw new Error('Sync recovery state could not be loaded.')
  if (
    !value.recovery.every(
      (item) => record(item) && safeName(item.name) && typeof item.destination === 'string' && remote(item),
    )
  )
    throw new Error('Sync recovery state could not be loaded.')
  if (!value.legacyDeletes.every(safeName)) throw new Error('Sync recovery state could not be loaded.')
  return value as unknown as ReconciliationState
}

/** Private atomic state, never enumerated as conversation history or S3 content. */
export function createReconciliationStorage(): ReconciliationStorage {
  const directory = new Directory(Paths.document, 'sync')
  const destination = new File(directory, 'reconciliation.json')
  return {
    async read() {
      if (!destination.exists) return null
      try {
        return parseReconciliationState(JSON.parse(await destination.text()))
      } catch {
        throw new Error('Sync recovery state could not be loaded.')
      }
    },
    async write(value) {
      directory.create({ idempotent: true, intermediates: true })
      const temporary = new File(directory, `.reconciliation.${Date.now()}.tmp`)
      temporary.create({ overwrite: true })
      temporary.write(JSON.stringify(value))
      await temporary.move(destination, { overwrite: true })
    },
  }
}
