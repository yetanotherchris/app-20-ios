import { describe, expect, it } from 'vitest'
import {
  emptyManifest,
  entryFromConversation,
  parseManifest,
  parseManifestSafe,
  sortManifestEntries,
  upsertManifestEntry,
  type ManifestEntry,
} from '../../src/storage/manifest'
import type { Conversation } from '../../src/storage/schema'

function entry(id: string, updatedAt: string): ManifestEntry {
  return { id, fileName: `${id}.json`, title: id, model: 'openrouter/auto', updatedAt }
}

describe('parseManifest', () => {
  it('parses a valid manifest', () => {
    const parsed = parseManifest({
      version: 1,
      conversations: [entry('a', '2026-09-10T12:00:00Z')],
    })
    expect(parsed?.conversations).toHaveLength(1)
  })

  it('returns null for malformed input', () => {
    expect(parseManifest(null)).toBeNull()
    expect(parseManifest({})).toBeNull()
    expect(parseManifest({ conversations: 'nope' })).toBeNull()
    expect(parseManifest({ conversations: [{}] })).toBeNull()
  })

  it('rejects duplicate ids, duplicate file names, and unsafe file names', () => {
    expect(
      parseManifest({
        conversations: [entry('a', '2026-09-10T12:00:00Z'), entry('a', '2026-09-10T12:00:00Z')],
      }),
    ).toBeNull()
    expect(
      parseManifest({
        conversations: [
          entry('a', '2026-09-10T12:00:00Z'),
          { ...entry('b', '2026-09-10T12:00:00Z'), fileName: 'a.json' },
        ],
      }),
    ).toBeNull()
    expect(
      parseManifest({
        conversations: [{ ...entry('a', '2026-09-10T12:00:00Z'), fileName: 'manifest.json' }],
      }),
    ).toBeNull()
    expect(
      parseManifest({
        conversations: [{ ...entry('a', '2026-09-10T12:00:00Z'), fileName: '../a.json' }],
      }),
    ).toBeNull()
  })

  it('returns null for unparseable json', () => {
    expect(parseManifestSafe('{ not json')).toBeNull()
  })

  it('treats an empty string as no manifest content', () => {
    expect(parseManifestSafe('')).toBeNull()
  })
})

describe('emptyManifest', () => {
  it('starts with no conversations', () => {
    expect(emptyManifest()).toEqual({ version: 1, conversations: [] })
  })
})

describe('upsertManifestEntry', () => {
  it('replaces the entry with the same id and sorts newest first', () => {
    const manifest = { version: 1 as const, conversations: [entry('a', '2026-09-10T12:00:00Z')] }
    const updated = upsertManifestEntry(manifest, entry('a', '2026-09-10T13:00:00Z'))
    expect(updated.conversations).toHaveLength(1)
    expect(updated.conversations[0]?.updatedAt).toBe('2026-09-10T13:00:00Z')

    const two = upsertManifestEntry(updated, entry('b', '2026-09-10T14:00:00Z'))
    expect(two.conversations.map((candidate) => candidate.id)).toEqual(['b', 'a'])
  })
})

describe('sortManifestEntries', () => {
  it('orders by updatedAt descending and id ascending as a tiebreak', () => {
    const sorted = sortManifestEntries([
      entry('c', '2026-09-10T12:00:00Z'),
      entry('a', '2026-09-10T13:00:00Z'),
      entry('b', '2026-09-10T13:00:00Z'),
    ])
    expect(sorted.map((candidate) => candidate.id)).toEqual(['a', 'b', 'c'])
  })
})

describe('entryFromConversation', () => {
  it('denormalises the manifest fields from the conversation', () => {
    const conversation: Conversation = {
      id: 'c1',
      title: 'Title',
      model: 'openrouter/auto',
      createdAt: '2026-09-10T12:00:00Z',
      updatedAt: '2026-09-10T12:05:00Z',
      messages: [],
    }
    expect(entryFromConversation(conversation, 'c1.json')).toEqual({
      id: 'c1',
      fileName: 'c1.json',
      title: 'Title',
      model: 'openrouter/auto',
      updatedAt: '2026-09-10T12:05:00Z',
    })
  })
})
