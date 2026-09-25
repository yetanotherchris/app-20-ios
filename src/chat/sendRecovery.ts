import type { Message } from 'app-20-llmchat'

export interface PendingSubmit {
  beforeIds: Set<string>
  text: string
  wasEditing: boolean
}

export type SendSettlement =
  | { kind: 'none' }
  | { kind: 'resend-failed' }
  | { kind: 'resend-succeeded' }
  | { kind: 'send-failed'; removedIds: string[] }

/**
 * Classifies how a settled send should be handled. A failed ordinary send rolls
 * back its pending pair and restores the draft; a failed resend keeps the
 * edited text; a successful resend restores the parked draft (FR-002, FR-016).
 */
export function classifySettlement(pending: PendingSubmit, messages: readonly Message[]): SendSettlement {
  const added = messages.filter((message) => !pending.beforeIds.has(message.id))
  const failed = added.at(-1)?.status === 'error'
  if (pending.wasEditing) {
    return failed ? { kind: 'resend-failed' } : { kind: 'resend-succeeded' }
  }
  if (failed) return { kind: 'send-failed', removedIds: added.map((message) => message.id) }
  return { kind: 'none' }
}
