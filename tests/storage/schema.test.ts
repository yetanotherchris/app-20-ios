import { describe, expect, it } from 'vitest'
import {
  parseConversation,
  parseConversationSafe,
  serializeConversation,
  toPersistedStatus,
  type Conversation,
} from '../../src/storage/schema'

function sampleConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'conversation-1',
    title: 'Export a CSV',
    model: 'openrouter/auto',
    createdAt: '2026-09-10T12:00:00.000Z',
    updatedAt: '2026-09-10T12:05:00.000Z',
    messages: [
      {
        id: 'm1',
        role: 'user',
        content: 'How do I export a CSV?',
        createdAt: '2026-09-10T12:00:00.000Z',
        status: 'complete',
      },
    ],
    ...overrides,
  }
}

describe('toPersistedStatus', () => {
  it('maps transient statuses to complete', () => {
    expect(toPersistedStatus('queued')).toBe('complete')
    expect(toPersistedStatus('sending')).toBe('complete')
    expect(toPersistedStatus('streaming')).toBe('complete')
    expect(toPersistedStatus('complete')).toBe('complete')
  })

  it('maps an unrecognised status to complete rather than dropping the message', () => {
    expect(toPersistedStatus('weird')).toBe('complete')
    expect(toPersistedStatus('')).toBe('complete')
  })

  it('keeps the terminal error and stopped statuses', () => {
    expect(toPersistedStatus('stopped')).toBe('stopped')
    expect(toPersistedStatus('error')).toBe('error')
  })
})

describe('parseConversation', () => {
  it('round-trips through serialize and parse', () => {
    const conversation = sampleConversation()
    expect(parseConversation(JSON.parse(serializeConversation(conversation)))).toEqual(conversation)
  })

  it('normalises a transient status at restore', () => {
    const parsed = parseConversation({
      ...sampleConversation(),
      messages: [
        {
          id: 'm1',
          role: 'assistant',
          content: 'partial',
          createdAt: '2026-09-10T12:00:00.000Z',
          status: 'streaming',
        },
      ],
    })
    expect(parsed?.messages[0]?.status).toBe('complete')
  })

  it('normalises a transient status when serializing', () => {
    const stored = serializeConversation({
      ...sampleConversation(),
      messages: [
        {
          id: 'm1',
          role: 'assistant',
          content: 'partial',
          createdAt: '2026-09-10T12:00:00.000Z',
          // @ts-expect-error a transient status must be normalised at save
          status: 'streaming',
        },
      ],
    })
    expect((JSON.parse(stored) as Conversation).messages[0]?.status).toBe('complete')
  })

  it('preserves the future optional message fields and drops unknown keys', () => {
    const parsed = parseConversation({
      ...sampleConversation(),
      messages: [
        {
          id: 'm1',
          role: 'user',
          content: 'hi',
          createdAt: '2026-09-10T12:00:00.000Z',
          status: 'complete',
          updatedAt: '2026-09-10T12:01:00.000Z',
          parentId: 'm0',
          error: 'none',
          metadata: { pinned: true },
          providerTrace: { vendor: 'leak' },
        },
      ],
    })

    const message = parsed?.messages[0]
    expect(message?.updatedAt).toBe('2026-09-10T12:01:00.000Z')
    expect(message?.parentId).toBe('m0')
    expect(message?.error).toBe('none')
    expect(message?.metadata).toEqual({ pinned: true })
    expect(serializeConversation(parsed as Conversation)).not.toContain('providerTrace')
    expect(serializeConversation(parsed as Conversation)).not.toContain('vendor')
  })

  it('tolerates a missing model and createdAt', () => {
    const parsed = parseConversation({
      id: 'conversation-1',
      title: 'Untitled',
      updatedAt: '2026-09-10T12:00:00.000Z',
      messages: [],
    })
    expect(parsed?.model).toBe('')
    expect(parsed?.createdAt).toBe('2026-09-10T12:00:00.000Z')
  })

  const invalid = [
    null,
    {},
    { id: 'x', title: 'y', updatedAt: 'z', messages: 'nope' },
    {
      id: 'x',
      title: 'y',
      updatedAt: 'z',
      messages: [{ role: 'user', content: 'c', createdAt: 't', status: 'complete' }],
    },
    {
      id: 'x',
      title: 'y',
      updatedAt: 'z',
      messages: [{ id: 'm', role: 'robot', content: 'c', createdAt: 't', status: 'complete' }],
    },
    {
      id: 'x',
      title: 'y',
      updatedAt: 'z',
      messages: [{ id: 'm', role: 'user', content: 5, createdAt: 't', status: 'complete' }],
    },
    { id: 'x', title: 'y', updatedAt: 'z', draft: 7, messages: [] },
    {
      id: 'x',
      title: 'y',
      updatedAt: 'z',
      messages: [{ id: 'm', role: 'user', content: 'c', createdAt: 't', status: 5 }],
    },
  ]

  for (const [index, value] of invalid.entries()) {
    it(`rejects invalid conversation ${index}`, () => {
      expect(parseConversation(value)).toBeNull()
    })
  }
})

describe('parseConversationSafe', () => {
  it('returns null for malformed JSON', () => {
    expect(parseConversationSafe('{ not json')).toBeNull()
  })
})
