import { describe, expect, it, vi } from 'vitest'
import { AutosaveQueue } from '../../src/chat/autosaveQueue'

describe('AutosaveQueue', () => {
  it('reports a failed flush while retaining the requested snapshot for a later retry', async () => {
    const saveSnapshot = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error('disk full'))
      .mockResolvedValueOnce(undefined)
    const onFailure = vi.fn()
    const queue = new AutosaveQueue({ createSnapshot: () => 'draft', saveSnapshot, onFailure })

    await expect(queue.flush()).resolves.toBe(false)
    await expect(queue.flush()).resolves.toBe(true)

    expect(onFailure).toHaveBeenCalledOnce()
    expect(saveSnapshot).toHaveBeenCalledTimes(2)
  })
})
