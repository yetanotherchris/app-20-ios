import { describe, expect, it } from 'vitest'
import type { Message } from 'app-20-llmchat'
import type { Conversation } from '../../src/storage'
import { toConversation } from '../../src/chat/conversation'

function userMessage(id: string, createdAt: string): Message {
  return {
    id,
    role: 'user',
    contentParts: [{ kind: 'text', format: 'plain', text: `text ${id}` }],
    status: 'complete',
    createdAt,
  }
}

const base: Conversation = {
  id: 'c1',
  title: 'Title',
  model: 'openrouter/auto',
  createdAt: '2026-09-10T10:00:00.000Z',
  updatedAt: '2026-09-10T11:00:00.000Z',
  messages: [
    {
      id: 'm1',
      role: 'user',
      content: 'hello',
      createdAt: '2026-09-10T11:00:00.000Z',
      status: 'complete',
    },
  ],
}

describe('toConversation ordering', () => {
  it('keeps updatedAt when only the draft changes (FR-006)', () => {
    const conversation = toConversation(
      {
        id: 'c1',
        createdAt: base.createdAt,
        model: base.model,
        messages: [userMessage('m1', '2026-09-10T11:00:00.000Z')],
        draft: 'a longer draft',
      },
      base,
    )
    expect(conversation.updatedAt).toBe('2026-09-10T11:00:00.000Z')
  })

  it('advances updatedAt when a newer message is present', () => {
    const conversation = toConversation(
      {
        id: 'c1',
        createdAt: base.createdAt,
        model: base.model,
        messages: [userMessage('m1', '2026-09-10T11:00:00.000Z'), userMessage('m2', '2026-09-10T12:30:00.000Z')],
        draft: '',
      },
      base,
    )
    expect(conversation.updatedAt).toBe('2026-09-10T12:30:00.000Z')
  })

  it('falls back to the base timestamp for an empty message list', () => {
    const conversation = toConversation(
      { id: 'c1', createdAt: base.createdAt, model: base.model, messages: [], draft: 'x' },
      base,
    )
    expect(conversation.updatedAt).toBe('2026-09-10T11:00:00.000Z')
  })
})
