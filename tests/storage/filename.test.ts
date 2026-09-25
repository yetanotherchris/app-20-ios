import { describe, expect, it } from 'vitest'
import { conversationFileName, uniqueConversationFileName } from '../../src/storage/filename'

describe('conversationFileName', () => {
  it('appends the json extension to the id', () => {
    expect(conversationFileName('conversation-1a2b')).toBe('conversation-1a2b.json')
  })
})

describe('uniqueConversationFileName', () => {
  it('uses the base name when it is free', () => {
    expect(uniqueConversationFileName('c1', [])).toBe('c1.json')
    expect(uniqueConversationFileName('c1', ['c2.json'])).toBe('c1.json')
  })

  it('suffixes past a colliding orphan and never overwrites it', () => {
    const existing = ['c1.json']
    expect(uniqueConversationFileName('c1', existing)).toBe('c1-2.json')
    expect(existing).toEqual(['c1.json'])
  })

  it('skips every taken suffix', () => {
    expect(uniqueConversationFileName('c1', ['c1.json', 'c1-2.json', 'c1-3.json'])).toBe('c1-4.json')
  })
})
