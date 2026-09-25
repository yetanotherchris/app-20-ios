import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSettingsOperations } from '../../src/settings/settingsOperations'

describe('settings operations', () => {
  afterEach(() => vi.useRealTimers())

  it('cancels an outdated scheduled save when an import begins', () => {
    vi.useFakeTimers()
    const save = vi.fn()
    const operations = createSettingsOperations()

    operations.schedule(save)
    expect(operations.beginImport()).toBe(true)
    vi.advanceTimersByTime(600)

    expect(save).not.toHaveBeenCalled()
  })

  it('allows only one import until the active import finishes', () => {
    const operations = createSettingsOperations()

    expect(operations.beginImport()).toBe(true)
    expect(operations.beginImport()).toBe(false)
    operations.finishImport()
    expect(operations.beginImport()).toBe(true)
  })
})
