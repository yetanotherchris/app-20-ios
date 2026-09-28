import { describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_PROVIDER_ENDPOINT,
  normalizeProviderEndpoint,
  providerFetch,
  providerRoute,
} from '../../src/ai/providerEndpoint'
const transport = vi.hoisted(() => vi.fn())
vi.mock('expo/fetch', () => ({ fetch: transport }))

describe('provider base URL', () => {
  it('defaults and preserves a normalized path prefix', () => {
    expect(normalizeProviderEndpoint('')).toBe(DEFAULT_PROVIDER_ENDPOINT)
    expect(providerRoute(' https://PROVIDER.example/custom/v1/// ', 'models')).toBe(
      'https://provider.example/custom/v1/models',
    )
    expect(providerRoute(undefined, 'chat/completions')).toBe(`${DEFAULT_PROVIDER_ENDPOINT}/chat/completions`)
  })
  it.each([
    'http://host/v1',
    '/relative',
    'https://u:p@host/v1',
    'https://host/v1?x=1',
    'https://host/v1#x',
    'https://host/v1?',
    'https://host/v1#',
    'https://host/v1/models/',
    'https://host/v1/chat/completions',
  ])('rejects unsafe or complete route %s', (url) => {
    expect(() => normalizeProviderEndpoint(url)).toThrow()
  })
  it('enforces redirect rejection on the native transport', async () => {
    transport.mockResolvedValue({ ok: true })
    await providerFetch('https://provider.example/v1/models', {
      headers: { Authorization: 'Bearer fixture' },
      redirect: 'follow',
    })
    expect(transport).toHaveBeenCalledWith(
      'https://provider.example/v1/models',
      expect.objectContaining({ redirect: 'error' }),
    )
  })
})
