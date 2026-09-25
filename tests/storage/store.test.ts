import { describe, expect, it } from 'vitest'
import { createConversationStore } from '../../src/storage/store'
import { createInMemoryConversationPort } from '../../src/storage/testing'
import { parseManifestSafe, serializeManifest, type ConversationManifest } from '../../src/storage/manifest'
import { serializeConversation, type Conversation } from '../../src/storage/schema'

function sampleConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'c1',
    title: 'Title',
    model: 'openrouter/auto',
    createdAt: '2026-09-10T12:00:00.000Z',
    updatedAt: '2026-09-10T12:05:00.000Z',
    messages: [
      {
        id: 'm1',
        role: 'user',
        content: 'hello',
        createdAt: '2026-09-10T12:00:00.000Z',
        status: 'complete',
      },
    ],
    ...overrides,
  }
}

describe('save', () => {
  it('writes the conversation file and a manifest entry', async () => {
    const port = createInMemoryConversationPort()
    const store = createConversationStore(port)

    const { fileName } = await store.save(sampleConversation())

    expect(fileName).toBe('c1.json')
    expect(port.files.has('c1.json')).toBe(true)
    const manifest = parseManifestSafe(port.files.get('manifest.json') ?? '')
    expect(manifest?.conversations).toHaveLength(1)
    expect(manifest?.conversations[0]).toMatchObject({
      id: 'c1',
      fileName: 'c1.json',
      title: 'Title',
      model: 'openrouter/auto',
    })
  })

  it('updates the same conversation in place', async () => {
    const port = createInMemoryConversationPort()
    const store = createConversationStore(port)

    await store.save(sampleConversation())
    await store.save(sampleConversation({ title: 'Updated' }))

    const manifest = parseManifestSafe(port.files.get('manifest.json') ?? '')
    expect(manifest?.conversations).toHaveLength(1)
    expect(manifest?.conversations[0]?.title).toBe('Updated')
  })

  it('gives a fresh name when an orphan already owns the base name', async () => {
    const port = createInMemoryConversationPort({ 'c1.json': '{ orphan }' })
    const store = createConversationStore(port)

    const { fileName } = await store.save(sampleConversation())

    expect(fileName).toBe('c1-2.json')
    expect(port.files.get('c1.json')).toBe('{ orphan }')
  })
})

describe('read', () => {
  it('returns the conversation for a known id', async () => {
    const port = createInMemoryConversationPort()
    const store = createConversationStore(port)
    await store.save(sampleConversation())

    const load = await store.read('c1')
    expect(load.kind).toBe('ok')
    if (load.kind === 'ok') expect(load.conversation.messages[0]?.content).toBe('hello')
  })

  it('round-trips an empty conversation', async () => {
    const port = createInMemoryConversationPort()
    const store = createConversationStore(port)
    await store.save(sampleConversation({ id: 'empty', messages: [] }))

    const load = await store.read('empty')
    expect(load.kind).toBe('ok')
    if (load.kind === 'ok') expect(load.conversation.messages).toEqual([])
  })

  it('reconciles before reading so an orphan file is reachable', async () => {
    const port = createInMemoryConversationPort({
      'conversation-orphan.json': serializeConversation(sampleConversation({ id: 'conversation-orphan' })),
    })
    const store = createConversationStore(port)

    const load = await store.read('conversation-orphan')
    expect(load.kind).toBe('ok')
  })

  it('reports a missing conversation', async () => {
    const store = createConversationStore(createInMemoryConversationPort())
    expect(await store.read('nope')).toEqual({ kind: 'missing' })
  })

  it('treats an unreadable file as missing', async () => {
    const manifest: ConversationManifest = {
      version: 1,
      conversations: [
        {
          id: 'c1',
          fileName: 'c1.json',
          title: 'Title',
          model: '',
          updatedAt: '2026-09-10T12:00:00.000Z',
        },
      ],
    }
    const port = createInMemoryConversationPort({ 'manifest.json': serializeManifest(manifest) })
    port.readText = async (fileName) => {
      if (fileName === 'c1.json') throw new Error('unreadable')
      throw new Error(`missing file: ${fileName}`)
    }
    const store = createConversationStore(port)

    expect(await store.read('c1')).toEqual({ kind: 'missing' })
  })

  it('reports a corrupt conversation without throwing', async () => {
    const manifest: ConversationManifest = {
      version: 1,
      conversations: [
        {
          id: 'c1',
          fileName: 'c1.json',
          title: 'Title',
          model: '',
          updatedAt: '2026-09-10T12:00:00.000Z',
        },
      ],
    }
    const port = createInMemoryConversationPort({
      'c1.json': '{ not json',
      'manifest.json': serializeManifest(manifest),
    })
    const store = createConversationStore(port)

    expect(await store.read('c1')).toEqual({ kind: 'corrupt' })
    expect(port.files.has('c1.json')).toBe(true)
  })
})

describe('clear', () => {
  it('deletes the manifest and valid conversation files only', async () => {
    const port = createInMemoryConversationPort({
      'c1.json': serializeConversation(sampleConversation()),
      'manifest.json': serializeManifest({ version: 1, conversations: [] }),
      'notes.txt': 'keep',
      'nested/c2.json': 'keep',
      'nested\\c3.json': 'keep',
    })
    const store = createConversationStore(port)

    await store.clear()

    expect([...port.files.keys()].sort()).toEqual(['nested/c2.json', 'nested\\c3.json', 'notes.txt'])
  })
})

describe('mutations', () => {
  it('renames a conversation and keeps the title in its manifest entry', async () => {
    const port = createInMemoryConversationPort()
    const store = createConversationStore(port)
    const original = sampleConversation()
    await store.save(original)

    const renamed = await store.rename('c1', '  Renamed conversation  ')

    expect(renamed.title).toBe('Renamed conversation')
    expect(renamed.updatedAt).toBe(original.updatedAt)
    expect((await store.list()).entries[0]?.title).toBe('Renamed conversation')
    const loaded = await store.read('c1')
    expect(loaded.kind).toBe('ok')
    if (loaded.kind === 'ok') expect(loaded.conversation.title).toBe('Renamed conversation')
  })

  it('rejects invalid conversation titles without changing the conversation', async () => {
    const store = createConversationStore(createInMemoryConversationPort())
    await store.save(sampleConversation())

    await expect(store.rename('c1', ' ')).rejects.toThrow('between 1 and 80')

    const loaded = await store.read('c1')
    expect(loaded.kind).toBe('ok')
    if (loaded.kind === 'ok') expect(loaded.conversation.title).toBe('Title')
  })

  it('deletes the conversation file and manifest entry', async () => {
    const port = createInMemoryConversationPort()
    const store = createConversationStore(port)
    await store.save(sampleConversation())

    await store.delete('c1')

    expect(port.files.has('c1.json')).toBe(false)
    expect((await store.list()).entries).toEqual([])
  })
})

describe('list', () => {
  it('treats a missing manifest as an empty history and repairs orphans', async () => {
    const port = createInMemoryConversationPort({
      'conversation-orphan.json': serializeConversation(sampleConversation({ id: 'conversation-orphan' })),
    })
    const store = createConversationStore(port)

    const result = await store.list()

    expect(result.entries.map((entry) => entry.id)).toEqual(['conversation-orphan'])
    expect(result.report).toEqual({ dropped: 0, repaired: 1, corrupt: 0 })
    const manifest = parseManifestSafe(port.files.get('manifest.json') ?? '')
    expect(manifest?.conversations).toHaveLength(1)
  })

  it('drops a manifest entry whose file is missing', async () => {
    const manifest: ConversationManifest = {
      version: 1,
      conversations: [
        {
          id: 'gone',
          fileName: 'gone.json',
          title: 'Gone',
          model: '',
          updatedAt: '2026-09-10T12:00:00.000Z',
        },
      ],
    }
    const port = createInMemoryConversationPort({
      'manifest.json': serializeManifest(manifest),
    })
    const store = createConversationStore(port)

    const result = await store.list()

    expect(result.entries).toEqual([])
    expect(result.report).toEqual({ dropped: 1, repaired: 0, corrupt: 0 })
  })

  it('reports a corrupt file and leaves it on disk', async () => {
    const port = createInMemoryConversationPort({ 'conversation-broken.json': '{ not json' })
    const store = createConversationStore(port)

    const result = await store.list()

    expect(result.entries).toEqual([])
    expect(result.report).toEqual({ dropped: 0, repaired: 0, corrupt: 1 })
    expect(port.files.get('conversation-broken.json')).toBe('{ not json')
  })
})
