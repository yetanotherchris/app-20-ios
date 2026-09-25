import { describe, expect, it } from 'vitest'
import { createProviderRegistry } from '../../src/ai/registry'
import { createScriptedProvider } from '../../src/ai/testing'

describe('createProviderRegistry', () => {
  it('registers an initial provider and resolves it by id', () => {
    const first = createScriptedProvider('first', ['a'])
    const registry = createProviderRegistry([first])
    expect(registry.get('first')).toBe(first)
    expect(registry.has('first')).toBe(true)
  })

  it('resolves a second provider registered later without changing the first', () => {
    const first = createScriptedProvider('first', ['a'])
    const second = createScriptedProvider('second', ['b'])
    const registry = createProviderRegistry([first])

    registry.register(second)

    expect(registry.get('second')).toBe(second)
    expect(registry.get('first')).toBe(first)
  })

  it('returns undefined for an unknown id', () => {
    expect(createProviderRegistry().get('missing')).toBeUndefined()
  })
})
