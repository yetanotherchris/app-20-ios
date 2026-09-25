import { isRecord } from './guards'

export type MessageRole = 'system' | 'user' | 'assistant' | 'tool'

/** Persisted statuses are terminal only; transient values normalise to `complete`. */
export type PersistedMessageStatus = 'complete' | 'stopped' | 'error'

export interface ConversationMessage {
  id: string
  role: MessageRole
  content: string
  createdAt: string
  status: PersistedMessageStatus
  updatedAt?: string
  parentId?: string
  error?: string
  metadata?: Record<string, unknown>
}

export interface Conversation {
  id: string
  title: string
  model: string
  createdAt: string
  updatedAt: string
  draft?: string
  messages: ConversationMessage[]
}

function isMessageRole(value: unknown): value is MessageRole {
  return value === 'system' || value === 'user' || value === 'assistant' || value === 'tool'
}

/**
 * FR-011: queued, sending, and streaming are transient; only complete, stopped,
 * and error reach disk. Anything unrecognised is treated as complete rather than
 * dropping the message.
 */
export function toPersistedStatus(value: string): PersistedMessageStatus {
  if (value === 'stopped' || value === 'error') return value
  return 'complete'
}

function serializeMessage(message: ConversationMessage): Record<string, unknown> {
  const output: Record<string, unknown> = {
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt,
    status: toPersistedStatus(message.status),
  }
  if (message.updatedAt !== undefined) output.updatedAt = message.updatedAt
  if (message.parentId !== undefined) output.parentId = message.parentId
  if (message.error !== undefined) output.error = message.error
  if (message.metadata !== undefined) output.metadata = message.metadata
  return output
}

/**
 * Emits the app-owned shape only. Unknown keys are dropped so no
 * provider-specific field can reach disk (FR-006), and message statuses are
 * normalised to terminal values (FR-011) regardless of the caller.
 */
export function serializeConversation(conversation: Conversation): string {
  const output: Record<string, unknown> = {
    id: conversation.id,
    title: conversation.title,
    model: conversation.model,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  }
  if (conversation.draft !== undefined) output.draft = conversation.draft
  output.messages = conversation.messages.map(serializeMessage)
  return JSON.stringify(output, null, 2)
}

function parseMessage(value: unknown): ConversationMessage | null {
  if (!isRecord(value)) return null
  const { id, role, content, createdAt, status, updatedAt, parentId, error, metadata } = value
  if (typeof id !== 'string' || typeof content !== 'string' || typeof createdAt !== 'string') {
    return null
  }
  if (!isMessageRole(role)) return null
  if (typeof status !== 'string') return null

  const message: ConversationMessage = {
    id,
    role,
    content,
    createdAt,
    status: toPersistedStatus(status),
  }
  if (typeof updatedAt === 'string') message.updatedAt = updatedAt
  if (typeof parentId === 'string') message.parentId = parentId
  if (typeof error === 'string') message.error = error
  if (isRecord(metadata)) message.metadata = metadata
  return message
}

/**
 * Validates external JSON field by field (coding standards section 3). The four
 * future optional message fields are preserved when present; any other unknown
 * key is ignored. Returns null for a file beta must treat as corrupt.
 */
export function parseConversation(value: unknown): Conversation | null {
  if (!isRecord(value)) return null
  const { id, title, model, createdAt, updatedAt, draft, messages } = value
  if (typeof id !== 'string' || typeof title !== 'string' || typeof updatedAt !== 'string') {
    return null
  }
  if (model !== undefined && typeof model !== 'string') return null
  if (createdAt !== undefined && typeof createdAt !== 'string') return null
  if (draft !== undefined && typeof draft !== 'string') return null
  if (!Array.isArray(messages)) return null

  const parsedMessages: ConversationMessage[] = []
  for (const entry of messages) {
    const message = parseMessage(entry)
    if (!message) return null
    parsedMessages.push(message)
  }

  const conversation: Conversation = {
    id,
    title,
    model: model ?? '',
    createdAt: createdAt ?? updatedAt,
    updatedAt,
    messages: parsedMessages,
  }
  if (draft !== undefined) conversation.draft = draft
  return conversation
}

export function parseConversationSafe(content: string): Conversation | null {
  try {
    return parseConversation(JSON.parse(content))
  } catch {
    return null
  }
}
