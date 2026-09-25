import { describe, expect, it } from 'vitest'
import {
  serializeConversation,
  serializeManifest,
  type Conversation,
  type ConversationFilePort,
} from '../../src/storage'
import { createInMemorySyncRemote } from '../../src/sync/testing'
import { syncOnce } from '../../src/sync/engine'

interface InMemoryLocalPort extends ConversationFilePort {
  readonly files: Map<string, string>
}

function createInMemoryLocalPort(seed: Record<string, string> = {}): InMemoryLocalPort {
  const files = new Map<string, string>(Object.entries(seed))
  return {
    files,
    async listFileNames() {
      return [...files.keys()]
    },
    async readText(fileName) {
      const content = files.get(fileName)
      if (content === undefined) throw new Error(`missing file: ${fileName}`)
      return content
    },
    async writeText(fileName, content) {
      files.set(fileName, content)
    },
    async deleteText(fileName) {
      files.delete(fileName)
    },
  }
}

function conversation(id: string, updatedAt: string, title = id): Conversation {
  return {
    id,
    title,
    model: 'openrouter/auto',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt,
    messages: [
      {
        id: `${id}-m1`,
        role: 'user',
        content: `content for ${id}`,
        createdAt: '2026-01-01T00:00:00.000Z',
        status: 'complete',
      },
    ],
  }
}

function raw(conversationValue: Conversation): string {
  return serializeConversation(conversationValue)
}

describe('syncOnce uploads local-only conversations', () => {
  it('writes local conversations and the manifest to the remote', async () => {
    const local = createInMemoryLocalPort({
      'a.json': raw(conversation('a', '2026-01-02T00:00:00.000Z')),
    })
    const remote = createInMemorySyncRemote()

    const report = await syncOnce(local, remote)

    expect(report.uploaded).toBe(1)
    expect(remote.objects.get('a.json')).toBe(local.files.get('a.json'))
    expect(remote.objects.get('manifest.json')).toBeDefined()
  })
})

describe('syncOnce downloads remote-only conversations', () => {
  it('downloads a conversation that is absent locally (deletion non-propagation)', async () => {
    const remoteConversation = conversation('b', '2026-01-03T00:00:00.000Z')
    const local = createInMemoryLocalPort({
      'manifest.json': serializeManifest({ version: 1, conversations: [] }),
    })
    const remote = createInMemorySyncRemote({ 'b.json': raw(remoteConversation) })

    const report = await syncOnce(local, remote)

    expect(report.downloaded).toBe(1)
    expect(local.files.get('b.json')).toBe(raw(remoteConversation))
  })
})

describe('syncOnce conflict rule', () => {
  it('downloads when the remote updatedAt is newer', async () => {
    const localConversation = conversation('c', '2026-01-01T00:00:00.000Z', 'local')
    const remoteConversation = conversation('c', '2026-01-05T00:00:00.000Z', 'remote')
    const local = createInMemoryLocalPort({ 'c.json': raw(localConversation) })
    const remote = createInMemorySyncRemote({ 'c.json': raw(remoteConversation) })

    const report = await syncOnce(local, remote)

    expect(report.downloaded).toBe(1)
    expect(report.uploaded).toBe(0)
    expect(local.files.get('c.json')).toBe(raw(remoteConversation))
  })

  it('uploads when the local updatedAt is newer and never clobbers local', async () => {
    const localConversation = conversation('d', '2026-01-05T00:00:00.000Z', 'local')
    const remoteConversation = conversation('d', '2026-01-01T00:00:00.000Z', 'remote')
    const local = createInMemoryLocalPort({ 'd.json': raw(localConversation) })
    const remote = createInMemorySyncRemote({ 'd.json': raw(remoteConversation) })

    const report = await syncOnce(local, remote)

    expect(report.uploaded).toBe(1)
    expect(report.downloaded).toBe(0)
    expect(remote.objects.get('d.json')).toBe(raw(localConversation))
  })

  it('writes nothing when both sides are equal', async () => {
    const shared = conversation('e', '2026-01-04T00:00:00.000Z')
    const local = createInMemoryLocalPort({ 'e.json': raw(shared) })
    const remote = createInMemorySyncRemote({ 'e.json': raw(shared) })

    const report = await syncOnce(local, remote)

    expect(report.uploaded).toBe(0)
    expect(report.downloaded).toBe(0)
  })
})

describe('syncOnce corrupt and empty objects', () => {
  it('skips a corrupt remote object and leaves local intact', async () => {
    const localConversation = conversation('f', '2026-01-02T00:00:00.000Z')
    const local = createInMemoryLocalPort({ 'f.json': raw(localConversation) })
    const remote = createInMemorySyncRemote({ 'f.json': '{ not json' })

    const report = await syncOnce(local, remote)

    expect(report.skipped).toBe(1)
    expect(report.uploaded).toBe(1)
    expect(remote.objects.get('f.json')).toBe(raw(localConversation))
    expect(local.files.get('f.json')).toBe(raw(localConversation))
  })

  it('repairs an empty remote object from the valid local copy', async () => {
    const localConversation = conversation('g', '2026-01-02T00:00:00.000Z')
    const local = createInMemoryLocalPort({ 'g.json': raw(localConversation) })
    const remote = createInMemorySyncRemote({ 'g.json': '' })

    const report = await syncOnce(local, remote)

    expect(report.uploaded).toBe(1)
    expect(remote.objects.get('g.json')).toBe(raw(localConversation))
  })

  it('leaves a corrupt local file untouched and does not download over it', async () => {
    const remoteConversation = conversation('h', '2026-01-09T00:00:00.000Z')
    const local = createInMemoryLocalPort({ 'h.json': 'not a conversation' })
    const remote = createInMemorySyncRemote({ 'h.json': raw(remoteConversation) })

    const report = await syncOnce(local, remote)

    expect(report.skipped).toBe(1)
    expect(local.files.get('h.json')).toBe('not a conversation')
    expect(remote.objects.get('h.json')).toBe(raw(remoteConversation))
  })

  it('ignores a corrupt remote manifest', async () => {
    const localConversation = conversation('i', '2026-01-02T00:00:00.000Z')
    const local = createInMemoryLocalPort({ 'i.json': raw(localConversation) })
    const remote = createInMemorySyncRemote({ 'manifest.json': 'garbage' })

    const report = await syncOnce(local, remote)

    expect(report.uploaded).toBe(1)
    expect(report.manifestUploaded).toBe(true)
  })

  it('counts a corrupt remote object with no local copy as skipped', async () => {
    const local = createInMemoryLocalPort()
    const remote = createInMemorySyncRemote({ 'z.json': 'broken' })

    const report = await syncOnce(local, remote)

    expect(report.skipped).toBe(1)
    expect(report.downloaded).toBe(0)
    expect(local.files.has('z.json')).toBe(false)
  })

  it('does not overwrite a local copy that became newer during the run', async () => {
    const older = raw(conversation('r', '2026-01-01T00:00:00.000Z', 'local old'))
    const newer = raw(conversation('r', '2026-03-01T00:00:00.000Z', 'local new'))
    const remoteRaw = raw(conversation('r', '2026-02-01T00:00:00.000Z', 'remote'))
    let reads = 0
    const local: ConversationFilePort = {
      async listFileNames() {
        return ['r.json']
      },
      async readText() {
        reads += 1
        return reads === 1 ? older : newer
      },
      async writeText(fileName) {
        if (fileName === 'r.json') throw new Error('must not overwrite a newer local copy')
      },
      async deleteText() {
        throw new Error('unused')
      },
    }
    const remote = createInMemorySyncRemote({ 'r.json': remoteRaw })

    const report = await syncOnce(local, remote)

    expect(report.downloaded).toBe(0)
    expect(reads).toBeGreaterThanOrEqual(2)
  })
})

describe('syncOnce manifest handling', () => {
  it('includes remote manifest entries as names to consider', async () => {
    const remoteConversation = conversation('j', '2026-01-06T00:00:00.000Z')
    const remoteManifest = serializeManifest({
      version: 1,
      conversations: [
        {
          id: 'j',
          fileName: 'j.json',
          title: 'j',
          model: 'openrouter/auto',
          updatedAt: remoteConversation.updatedAt,
        },
      ],
    })
    const local = createInMemoryLocalPort()
    const remote = createInMemorySyncRemote({
      'manifest.json': remoteManifest,
      'j.json': raw(remoteConversation),
    })

    const report = await syncOnce(local, remote)

    expect(report.downloaded).toBe(1)
    expect(local.files.get('j.json')).toBe(raw(remoteConversation))
  })

  it('rebuilds and uploads the manifest from the files present after sync', async () => {
    const local = createInMemoryLocalPort({
      'k.json': raw(conversation('k', '2026-01-02T00:00:00.000Z')),
    })
    const remote = createInMemorySyncRemote()

    const report = await syncOnce(local, remote)

    expect(report.manifestUploaded).toBe(true)
    const manifest = JSON.parse(remote.objects.get('manifest.json') ?? '{}') as {
      conversations: { fileName: string }[]
    }
    expect(manifest.conversations.map((entry) => entry.fileName)).toEqual(['k.json'])
  })
})
