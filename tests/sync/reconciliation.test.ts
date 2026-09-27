import { describe, expect, it, vi } from 'vitest'
import { createConversationStore, serializeConversation, type Conversation } from '../../src/storage'
import { createInMemoryConversationPort } from '../../src/storage/testing'
import { createInMemorySyncRemote } from '../../src/sync/testing'
import { ReconciliationCoordinator, type ReconciliationState } from '../../src/sync/reconciliation'
import { compareInstants, equivalent, freshTimestamp, instant } from '../../src/sync/revision'
import type { S3Config } from '../../src/secrets/secretService'

const config: S3Config = {
  bucket: 'test-bucket',
  region: 'us-east-1',
  accessKeyId: 'test-id',
  secretAccessKey: 'test-secret',
}
const time = '2026-01-01T00:00:00.000Z'
function raw(title = 'local', updatedAt = time) {
  return serializeConversation({ id: 'a', title, model: '', createdAt: time, updatedAt, messages: [] })
}
function fixture(localSeed: Record<string, string> = {}, remoteSeed: Record<string, string> = {}) {
  const local = createInMemoryConversationPort(localSeed),
    remote = createInMemorySyncRemote(remoteSeed)
  let state: ReconciliationState | null = null
  let current: S3Config | null = config
  let busy = false
  const applied = vi.fn(),
    history = vi.fn(),
    factory = vi.fn(() => remote)
  const storage = {
    read: async () => (state ? structuredClone(state) : null),
    write: async (value: ReconciliationState) => {
      state = structuredClone(value)
    },
  }
  const create = () =>
    new ReconciliationCoordinator({
      local,
      remote: factory,
      config: async () => current,
      storage,
      isActive: () => busy,
      onApplied: applied,
      onHistory: history,
    })
  const sync = create()
  return {
    local,
    remote,
    sync,
    storage,
    create,
    applied,
    history,
    factory,
    state: () => state!,
    configure: (value: S3Config | null) => {
      current = value
    },
    busy: (value: boolean) => {
      busy = value
    },
  }
}

it('imports remote-only history and deduplicates unchanged objects and manifests', async () => {
  const f = fixture({}, { 'a.json': raw('remote') })
  const writes = vi.spyOn(f.remote, 'writeText')
  await f.sync.run()
  expect(f.local.files.get('a.json')).toBe(raw('remote'))
  expect(f.history).toHaveBeenCalled()
  writes.mockClear()
  await f.sync.run()
  expect(writes).not.toHaveBeenCalled()
})
it('makes no remote requests with incomplete configuration', async () => {
  const f = fixture()
  f.configure(null)
  await f.sync.run()
  expect(f.factory).not.toHaveBeenCalled()
  expect(f.sync.state()).toBe('disabled')
})
it('holds equal-time conflicts across later local saves, retry and relaunch, retaining manifest entry', async () => {
  const f = fixture(
    { 'a.json': raw() },
    {
      'a.json': raw('remote'),
      'manifest.json': JSON.stringify({
        version: 1,
        conversations: [{ id: 'a', fileName: 'a.json', title: 'remote', model: '', updatedAt: time }],
      }),
    },
  )
  await f.sync.schedule({ name: 'a.json', content: raw(), revision: 1 })
  await f.sync.run()
  expect(f.sync.holds()[0]?.kind).toBe('conflict')
  f.local.files.set('a.json', raw('later', '2026-02-01T00:00:00Z'))
  await f.create().run()
  expect(f.remote.objects.get('a.json')).toBe(raw('remote'))
  expect(JSON.parse(f.remote.objects.get('manifest.json')!).conversations[0].title).toBe('remote')
  expect(f.state().holds).toHaveLength(1)
})
it.each(['local', 'remote'] as const)('resolves %s after preserving both displaced revisions', async (choice) => {
  const f = fixture({ 'a.json': raw() }, { 'a.json': raw('remote') })
  await f.sync.run()
  const token = f.sync.holds()[0]!
  expect(await f.sync.resolve('a.json', choice, token)).toBe('resolved')
  const chosen = JSON.parse(f.local.files.get('a.json')!) as Conversation
  expect(chosen.title).toBe(choice === 'local' ? 'local' : 'remote')
  expect(instant(chosen.updatedAt)!.seconds).toBeGreaterThan(instant(time)!.seconds)
  expect(f.remote.objects.get('a.json')).toBe(f.local.files.get('a.json'))
  expect(f.state().holds).toHaveLength(0)
  expect(f.state().recovery.map((r) => r.text)).toContain(raw('remote'))
  expect(f.state().recovery.map((r) => r.text)).toContain(raw())
})
it('requires fresh choice when remote changed; active work prevents resolution', async () => {
  const f = fixture({ 'a.json': raw() }, { 'a.json': raw('remote') })
  await f.sync.run()
  const token = f.sync.holds()[0]!
  f.remote.objects.set('a.json', raw('changed'))
  expect(await f.sync.resolve('a.json', 'local', token)).toBe('changed')
  f.busy(true)
  expect(await f.sync.resolve('a.json', 'remote', f.sync.holds()[0]!)).toBe('busy')
  expect(f.local.files.get('a.json')).toBe(raw())
})
it('holds malformed objects and preserves original invalid UTF8 bytes before explicit repair', async () => {
  const f = fixture({ 'a.json': raw() }, { 'a.json': 'bad' })
  f.remote.readRevision = async (name) => ({
    text: await f.remote.readText(name),
    bytes: name === 'a.json' ? [255, 254, 1] : [],
  })
  await f.sync.run()
  await f.create().run()
  expect(f.remote.objects.get('a.json')).toBe('bad')
  expect(f.sync.holds()[0]?.kind).toBe('malformed')
  await f.sync.resolve('a.json', 'local', f.sync.holds()[0]!)
  expect(f.state().recovery.some((r) => JSON.stringify(r.bytes) === '[255,254,1]')).toBe(true)
})
it('preserves corrupt local data and holds its remote manifest entry', async () => {
  const f = fixture({ 'a.json': 'broken' }, { 'a.json': raw('remote') })
  await f.sync.run()
  expect(f.local.files.get('a.json')).toBe('broken')
  expect(f.sync.holds()[0]?.kind).toBe('local-corrupt')
})
it('defers active downloads, applies once idle unchanged, and preserves live selection via callback', async () => {
  const f = fixture({ 'a.json': raw() }, { 'a.json': raw('remote', '2026-02-01T00:00:00Z') })
  f.busy(true)
  await f.sync.run()
  expect(f.local.files.get('a.json')).toBe(raw())
  expect(f.state().deferred).toHaveLength(1)
  f.busy(false)
  await f.sync.run()
  expect(f.local.files.get('a.json')).toContain('remote')
  expect(f.applied).toHaveBeenCalled()
  expect(f.state().deferred).toHaveLength(0)
})
it('turns deferred local divergence into durable conflict regardless of newer remote timestamp', async () => {
  const f = fixture({ 'a.json': raw() }, { 'a.json': raw('remote', '2026-03-01T00:00:00Z') })
  f.busy(true)
  await f.sync.run()
  f.local.files.set('a.json', raw('edited', '2026-02-01T00:00:00Z'))
  f.busy(false)
  await f.create().run()
  expect(f.state().holds[0]?.kind).toBe('conflict')
  expect(f.local.files.get('a.json')).toContain('edited')
})
it('rechecks changed remote candidates instead of applying deferred stale bytes', async () => {
  const f = fixture({ 'a.json': raw() }, { 'a.json': raw('candidate', '2026-03-01T00:00:00Z') })
  f.busy(true)
  await f.sync.run()
  f.remote.objects.set('a.json', raw('fresh', '2026-04-01T00:00:00Z'))
  f.busy(false)
  await f.sync.run()
  expect(f.local.files.get('a.json')).toContain('fresh')
})
it('preserves concurrent local save arriving during remote read', async () => {
  const f = fixture({ 'a.json': raw() }, { 'a.json': raw('remote', '2026-03-01T00:00:00Z') })
  const read = f.remote.readText
  f.remote.readText = async (name) => {
    if (name === 'a.json')
      await f.sync.localMutation(async () => {
        f.local.files.set(name, raw('concurrent', '2026-02-01T00:00:00Z'))
      })
    return read(name)
  }
  await f.sync.run()
  expect(f.local.files.get('a.json')).toContain('concurrent')
  expect(f.sync.holds()[0]?.kind).toBe('conflict')
})
it('relaunch applies pending deletes before import and retries upload with latest snapshot', async () => {
  const f = fixture({ 'a.json': raw() }, { 'a.json': raw('remote', '2025-01-01T00:00:00Z') })
  const write = f.remote.writeText
  f.remote.writeText = async () => {
    throw new Error('offline')
  }
  await f.sync.schedule({ name: 'a.json', content: raw('obsolete'), revision: 1 })
  await f.sync.run()
  expect(f.sync.state()).toBe('error')
  f.local.files.set('a.json', raw('latest', '2026-05-01T00:00:00Z'))
  f.remote.writeText = write
  await f.create().run()
  expect(f.remote.objects.get('a.json')).toContain('latest')
  const del = f.remote.deleteText
  f.remote.deleteText = async () => {
    throw new Error('offline')
  }
  f.local.files.delete('a.json')
  await f.sync.schedule({ name: 'a.json', content: null, revision: 2 })
  await f.sync.run()
  f.remote.deleteText = del
  await f.create().run()
  expect(f.local.files.has('a.json')).toBe(false)
  expect(f.remote.objects.has('a.json')).toBe(false)
})
it('keeps local history available after permission errors and never interprets them as absence', async () => {
  const f = fixture({ 'a.json': raw() })
  f.remote.readText = async () => {
    throw new Error('AccessDenied secret detail')
  }
  const writes = vi.spyOn(f.remote, 'writeText')
  await f.sync.run()
  expect(f.sync.state()).toBe('error')
  expect(f.local.files.get('a.json')).toBe(raw())
  expect(writes).not.toHaveBeenCalled()
})
it('serializes overlapping runs and fences obsolete configuration downloads/status', async () => {
  const f = fixture({}, { 'a.json': raw('old-destination') })
  let release!: () => void
  let signalStarted!: () => void
  const started = new Promise<void>((resolve) => {
      signalStarted = resolve
    }),
    wait = new Promise<void>((resolve) => {
      release = resolve
    })
  const read = f.remote.readText
  f.remote.readText = async (name) => {
    if (name === 'a.json') {
      signalStarted()
      await wait
    }
    return read(name)
  }
  const first = f.sync.run()
  await started
  f.configure(null)
  const second = f.sync.configurationChanged()
  release()
  await Promise.all([first, second])
  expect(f.local.files.has('a.json')).toBe(false)
  expect(f.sync.state()).toBe('disabled')
})
it('switches destination, preserves retired candidates and reconciles all local files without secrets in state', async () => {
  const f = fixture({ 'a.json': raw() }, { 'a.json': raw('remote') })
  await f.sync.run()
  f.remote.objects.clear()
  f.configure({ ...config, bucket: 'new-bucket', secretAccessKey: 'changed-secret' })
  await f.sync.configurationChanged()
  expect(f.remote.objects.get('a.json')).toBe(raw())
  expect(f.state().recovery.map((r) => r.text)).toContain(raw('remote'))
  expect(JSON.stringify(f.state())).not.toContain('changed-secret')
  expect(JSON.stringify(f.state())).not.toContain('test-secret')
})
it.each(['local', 'remote'] as const)(
  'migrates legacy delete as reachable suppression and resolves %s with explicit choice',
  async (choice) => {
    const f = fixture({}, { 'a.json': raw('remote') })
    const sync = new ReconciliationCoordinator({
      local: f.local,
      config: async () => config,
      remote: () => f.remote,
      storage: f.storage,
      legacyOperations: async () => [{ name: 'a.json', content: null, revision: 1 }],
    })
    await sync.run()
    expect(f.local.files.has('a.json')).toBe(false)
    expect(sync.holds()[0]?.kind).toBe('legacy-delete')
    await f.create().run()
    expect(f.local.files.has('a.json')).toBe(false)
    await sync.resolve('a.json', choice, sync.holds()[0]!)
    expect(f.remote.objects.has('a.json')).toBe(choice === 'remote')
    expect(f.state().legacyDeletes).toHaveLength(0)
  },
)
it('allows unrelated objects to sync while held object remains intact', async () => {
  const f = fixture({ 'a.json': raw(), 'b.json': raw('b') }, { 'a.json': raw('remote') })
  await f.sync.run()
  expect(f.remote.objects.has('b.json')).toBe(true)
  expect(f.remote.objects.get('a.json')).toBe(raw('remote'))
})

describe('RFC3339 precision and semantic equality', () => {
  it.each([
    '2026-02-30T00:00:00Z',
    '2025-02-29T00:00:00Z',
    '2026-01-01T00:00:00',
    '2026-01-01T24:00:00Z',
    '2026-01-01T00:00:00+24:00',
    'not-date',
  ])('rejects %s', (value) => expect(instant(value)).toBeNull())
  it('retains arbitrary submillisecond precision and normalizes offsets', () => {
    expect(compareInstants(instant('2026-01-01T00:00:00.000000001Z')!, instant('2026-01-01T00:00:00Z')!)).toBe(1)
    expect(equivalent(raw('same'), raw('same', '2026-01-01T01:00:00+01:00'))).toBe(true)
    expect(freshTimestamp('2026-01-01T00:00:00.000000001Z')).toMatch(/\.\d{3}Z$/)
  })
  it('compares parsed data irrespective of key order while preserving provenance and message ordering', () => {
    const parsed = JSON.parse(raw())
    expect(equivalent(raw(), JSON.stringify(Object.fromEntries(Object.entries(parsed).reverse())))).toBe(true)
    expect(equivalent(raw(), JSON.stringify({ ...parsed, selectionProvenance: { endpoint: 'other' } }))).toBe(false)
  })
})

it('never sends a queued deletion after a local deletion failure or interrupted prepare', async () => {
  const f = fixture({ 'a.json': raw() }, { 'a.json': raw() })
  await f.sync.run()
  await expect(
    f.sync.deleteLocally('a.json', async () => {
      throw new Error('disk failed')
    }),
  ).rejects.toThrow('disk failed')
  await f.create().run()
  expect(f.remote.objects.get('a.json')).toBe(raw())
  await f.sync.schedule({ name: 'a.json', content: null, revision: 1 })
  await f.sync.run()
  expect(f.remote.objects.get('a.json')).toBe(raw())
  expect(f.local.files.get('a.json')).toBe(raw())
})
it('rejects old-destination conflict choices even when candidate bytes are identical', async () => {
  const f = fixture({ 'a.json': raw() }, { 'a.json': raw('remote') })
  await f.sync.run()
  const old = f.sync.holds()[0]!
  f.configure({ ...config, bucket: 'other-bucket' })
  await f.sync.configurationChanged()
  expect(await f.sync.resolve('a.json', 'local', old)).toBe('changed')
  expect(f.sync.holds()).toHaveLength(1)
  expect(f.remote.objects.get('a.json')).toBe(raw('remote'))
})
it('rejects an old choice after switching away and back to the same destination', async () => {
  const f = fixture({ 'a.json': raw() }, { 'a.json': raw('remote') })
  await f.sync.run()
  const old = f.sync.holds()[0]!
  f.configure(null)
  await f.sync.configurationChanged()
  f.configure(config)
  await f.sync.configurationChanged()
  expect(await f.sync.resolve('a.json', 'local', old)).toBe('changed')
})
it('skips URI aliases/traversal before any local access', async () => {
  const f = fixture(
    {},
    {
      '%2e%2e%2fsync%2freconciliation.json': raw(),
      'manifest.json%23x.json': raw(),
      'a?x.json': raw(),
      '.json': raw(),
    },
  )
  await f.sync.run()
  expect(f.local.files.size).toBe(1)
  expect(f.local.files.has('manifest.json')).toBe(true)
  expect(f.sync.report().skipped).toBe(4)
})

it.each(['persistence', 'file-write'])(
  'defers work that begins during download %s without replacing live edits',
  async (stage) => {
    const f = fixture({ 'a.json': raw() }, { 'a.json': raw('remote', '2026-02-01T00:00:00Z') })
    let once = false
    if (stage === 'persistence') {
      const persist = f.storage.write
      f.storage.write = async (state) => {
        if (!once && state.deferred.length > 0) {
          once = true
          f.busy(true)
        }
        await persist(state)
      }
    } else {
      const write = f.local.writeText
      f.local.writeText = async (name, value) => {
        await write(name, value)
        if (!once && name === 'a.json' && value.includes('remote')) {
          once = true
          f.busy(true)
        }
      }
    }
    await f.sync.run()
    expect(f.applied).not.toHaveBeenCalled()
    expect(f.local.files.get('a.json')).toBe(raw())
    expect(f.state().deferred).toHaveLength(1)
    f.local.files.set('a.json', raw('new local edit', '2026-03-01T00:00:00Z'))
    f.busy(false)
    await f.sync.run()
    expect(f.sync.holds()[0]?.kind).toBe('conflict')
  },
)
it.each(['persistence', 'file-write'])('keeps a resolution held when new work starts during %s', async (stage) => {
  const f = fixture({ 'a.json': raw() }, { 'a.json': raw('remote') })
  await f.sync.run()
  const presented = f.sync.holds()[0]!
  let once = false
  if (stage === 'persistence') {
    const persist = f.storage.write
    f.storage.write = async (state) => {
      if (!once) {
        once = true
        f.busy(true)
      }
      await persist(state)
    }
  } else {
    const write = f.local.writeText
    f.local.writeText = async (name, value) => {
      await write(name, value)
      if (!once && name === 'a.json') {
        once = true
        f.busy(true)
      }
    }
  }
  expect(await f.sync.resolve('a.json', 'remote', presented)).toBe('busy')
  expect(f.local.files.get('a.json')).toBe(raw())
  expect(f.applied).not.toHaveBeenCalled()
  expect(f.sync.holds()).toHaveLength(1)
})
it('refreshes each successful import before a subsequent remote read fails', async () => {
  const f = fixture({}, { 'a.json': raw('imported'), 'b.json': raw('failed') })
  const read = f.remote.readText
  f.remote.readText = async (name) => {
    if (name === 'b.json') throw new Error('offline')
    return read(name)
  }
  await f.sync.run()
  expect(f.sync.state()).toBe('error')
  expect(f.history).toHaveBeenCalled()
  expect(f.local.files.get('a.json')).toBe(raw('imported'))
})
it('refreshes imports even when outbound manifest permission is denied', async () => {
  const f = fixture({}, { 'a.json': raw('imported') })
  f.remote.writeText = async () => {
    throw new Error('denied')
  }
  await f.sync.run()
  expect(f.sync.state()).toBe('error')
  expect(f.history).toHaveBeenCalled()
  expect(f.local.files.get('a.json')).toBe(raw('imported'))
})
it('prunes deleted manifest metadata on relaunch after deletion succeeded but manifest failed', async () => {
  const f = fixture({ 'a.json': raw() }, { 'a.json': raw() })
  await f.sync.run()
  const write = f.remote.writeText
  f.remote.writeText = async (name, value) => {
    if (name === 'manifest.json') throw new Error('offline')
    await write(name, value)
  }
  await f.sync.deleteLocally('a.json', async () => {
    f.local.files.delete('a.json')
  })
  await f.sync.run()
  expect(f.remote.objects.has('a.json')).toBe(false)
  expect(f.sync.state()).toBe('error')
  f.remote.writeText = write
  await f.create().run()
  expect(JSON.parse(f.remote.objects.get('manifest.json')!).conversations).toEqual([])
})
it('never overwrites a newer remote revision arriving between GET and conditional PUT', async () => {
  const f = fixture(
    { 'a.json': raw('local', '2026-02-01T00:00:00Z') },
    { 'a.json': raw('old', '2026-01-01T00:00:00Z') },
  )
  const conditional = f.remote.writeRevision!.bind(f.remote)
  let once = false
  f.remote.writeRevision = async (name, value, expected) => {
    if (!once && name === 'a.json') {
      once = true
      f.remote.objects.set(name, raw('new concurrent', '2026-03-01T00:00:00Z'))
    }
    await conditional(name, value, expected)
  }
  await f.sync.run()
  expect(f.remote.objects.get('a.json')).toContain('new concurrent')
  expect(f.local.files.get('a.json')).toContain('new concurrent')
  expect(f.state().recovery.some((r) => r.text?.includes('"local"'))).toBe(true)
})
it('requires a fresh repair choice if the remote changes during its conditional replacement', async () => {
  const f = fixture({ 'a.json': raw() }, { 'a.json': 'malformed' })
  await f.sync.run()
  const conditional = f.remote.writeRevision!.bind(f.remote)
  let once = false
  f.remote.writeRevision = async (name, value, expected) => {
    if (!once && name === 'a.json') {
      once = true
      f.remote.objects.set(name, raw('other client'))
    }
    await conditional(name, value, expected)
  }
  await f.sync.resolve('a.json', 'local', f.sync.holds()[0]!)
  expect(f.remote.objects.get('a.json')).toBe(raw('other client'))
  expect(f.sync.holds()[0]?.kind).toBe('conflict')
})

it('refreshes existing history metadata before a subsequent remote read fails', async () => {
  const f = fixture(
    { 'a.json': raw('old title') },
    { 'a.json': raw('new title', '2026-02-01T00:00:00Z'), 'b.json': raw() },
  )
  const store = createConversationStore(f.local)
  await store.list()
  let visibleTitle = ''
  f.history.mockImplementation(async () => {
    visibleTitle = (await store.list()).entries[0]!.title
  })
  const read = f.remote.readText
  f.remote.readText = async (name) => {
    if (name === 'b.json') throw new Error('offline')
    return read(name)
  }
  await f.sync.run()
  expect(f.sync.state()).toBe('error')
  expect(visibleTitle).toBe('new title')
})
it('recovers an applied download after its deferred cleanup persistence fails', async () => {
  const f = fixture({ 'a.json': raw() }, { 'a.json': raw('remote', '2026-02-01T00:00:00Z') })
  const write = f.storage.write
  let once = false
  f.storage.write = async (value) => {
    if (!once && f.local.files.get('a.json')?.includes('"remote"') && value.deferred.length === 0) {
      once = true
      throw new Error('disk unavailable')
    }
    await write(value)
  }
  await f.sync.run()
  expect(f.sync.state()).toBe('error')
  await f.create().run()
  expect(f.state().holds).toHaveLength(0)
  expect(f.state().deferred).toHaveLength(0)
  expect(f.local.files.get('a.json')).toContain('"remote"')
})
