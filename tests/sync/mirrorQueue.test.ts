import { describe, expect, it, vi } from 'vitest'
import { MirrorQueue, type MirrorOperation, type MirrorQueueStorage } from '../../src/sync/mirrorQueue'

function storage(seed: MirrorOperation[] = []): MirrorQueueStorage & { values: MirrorOperation[] } {
  const result = {
    values: seed,
    read: vi.fn(async () => result.values),
    write: vi.fn(async (values: readonly MirrorOperation[]) => {
      result.values = [...values]
    }),
  }
  return result
}

describe('MirrorQueue', () => {
  it('persists the newest operation before writing it once to the remote', async () => {
    const queueStorage = storage()
    const remote = {
      deleteText: vi.fn(),
      listNames: vi.fn(),
      readText: vi.fn(),
      writeText: vi.fn(),
    }
    const queue = new MirrorQueue(queueStorage, async () => remote, vi.fn())

    await queue.schedule({ name: 'c.json', revision: 1, content: 'old' })
    await queue.schedule({ name: 'c.json', revision: 2, content: 'new' })
    await queue.run()

    expect(queueStorage.write).toHaveBeenCalled()
    expect(remote.writeText).toHaveBeenLastCalledWith('c.json', 'new')
    expect(queueStorage.values).toEqual([])
  })

  it('keeps failed operations for a later retry without modifying local storage', async () => {
    const queueStorage = storage([{ name: 'c.json', revision: 1, content: 'content' }])
    const remote = {
      deleteText: vi.fn(),
      listNames: vi.fn(),
      readText: vi.fn(),
      writeText: vi.fn().mockRejectedValue(new Error('offline')),
    }
    const queue = new MirrorQueue(queueStorage, async () => remote, vi.fn())

    await queue.run()

    expect(queueStorage.values).toEqual([{ name: 'c.json', revision: 1, content: 'content' }])
  })

  it('delivers a newer revision that arrives during an in-flight send (FR-022)', async () => {
    const queueStorage = storage()
    const writes: string[] = []
    let signalStarted: () => void = () => undefined
    const started = new Promise<void>((resolve) => {
      signalStarted = resolve
    })
    let release: () => void = () => undefined
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const remote = {
      deleteText: vi.fn(),
      listNames: vi.fn(),
      readText: vi.fn(),
      writeText: vi.fn(async (_name: string, content: string) => {
        writes.push(content)
        if (writes.length === 1) {
          signalStarted()
          await gate
        }
      }),
    }
    const queue = new MirrorQueue(queueStorage, async () => remote, vi.fn())

    await queue.schedule({ name: 'c.json', revision: 1, content: 'first' })
    const running = queue.run()
    await started
    await queue.schedule({ name: 'c.json', revision: 2, content: 'second' })
    release()
    await running

    expect(writes).toEqual(['first', 'second'])
    expect(queueStorage.values).toEqual([])
  })

  it('supersedes a persisted operation after the host restarts (FR-022)', async () => {
    const queueStorage = storage([{ name: 'c.json', revision: 8, content: 'stale' }])
    const remote = {
      deleteText: vi.fn(),
      listNames: vi.fn(),
      readText: vi.fn(),
      writeText: vi.fn(),
    }
    const queue = new MirrorQueue(queueStorage, async () => remote, vi.fn())

    // A fresh host starts its local counter at one, below the persisted value.
    await queue.schedule({ name: 'c.json', revision: 1, content: 'newest' })
    await queue.run()

    expect(remote.writeText).toHaveBeenCalledWith('c.json', 'newest')
    expect(queueStorage.values).toEqual([])
  })

  it('does not run remote work when a complete configuration is absent', async () => {
    const queueStorage = storage([{ name: 'c.json', revision: 1, content: 'content' }])
    const queue = new MirrorQueue(queueStorage, async () => null, vi.fn())

    await queue.run()

    expect(queueStorage.values).toEqual([{ name: 'c.json', revision: 1, content: 'content' }])
  })
})
