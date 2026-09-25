import type { Message, MessageRole } from 'app-20-llmchat'
import { toPersistedStatus, type Conversation, type ConversationMessage } from '../storage'

export interface ConversationDraft {
  id: string
  createdAt: string
  model: string
  messages: readonly Message[]
  draft: string
}

function messageText(message: Message): string {
  return message.contentParts.map((part) => part.text).join('')
}

function isRenderable(message: ConversationMessage): message is ConversationMessage & { role: MessageRole } {
  return message.role !== 'tool'
}

function newestActivity(value: ConversationDraft, base: Conversation | null): string {
  const timestamps = value.messages.map((message) => message.createdAt)
  const newest = timestamps.length > 0 ? timestamps.reduce((a, b) => (a > b ? a : b)) : undefined
  return newest ?? base?.updatedAt ?? value.createdAt
}

export function toConversation(value: ConversationDraft, base: Conversation | null): Conversation {
  const previous = new Map(base?.messages.map((message) => [message.id, message]))
  const messages = value.messages.map((message) => {
    const stored: ConversationMessage = {
      id: message.id,
      role: message.role,
      content: messageText(message),
      createdAt: message.createdAt,
      status: toPersistedStatus(message.status),
    }
    const prior = previous.get(message.id)
    return prior ? { ...prior, ...stored } : stored
  })
  return {
    id: value.id,
    title: base?.title || messages.find((message) => message.role === 'user')?.content.slice(0, 80) || '',
    model: value.model,
    createdAt: base?.createdAt ?? value.createdAt,
    // Ordering follows message activity only, so a draft edit or rename does
    // not reorder history (spec 119 FR-006).
    updatedAt: newestActivity(value, base),
    draft: value.draft,
    messages,
  }
}

export function fromConversation(conversation: Conversation): Message[] {
  return conversation.messages.filter(isRenderable).map((message) => ({
    id: message.id,
    role: message.role,
    contentParts: [
      {
        kind: 'text',
        format: message.role === 'user' ? 'plain' : 'markdown',
        text: message.content,
      },
    ],
    status: message.status,
    createdAt: message.createdAt,
  }))
}

export function toProviderMessages(messages: readonly Message[], excludeId?: string) {
  return messages.flatMap((message) => {
    const content = messageText(message)
    return message.id === excludeId || content.length === 0 ? [] : [{ role: message.role, content }]
  })
}
