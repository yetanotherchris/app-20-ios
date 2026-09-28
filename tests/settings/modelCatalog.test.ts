import { describe, expect, it, vi } from 'vitest'
import { catalogCache, loadModelCatalog, searchModels, type CatalogFetch } from '../../src/settings/modelCatalog'
const endpoint = 'https://models.example/prefix/v1'
const signal = () => new AbortController().signal
function response(body: unknown) {
  return { ok: true, status: 200, json: async () => body }
}

describe('full catalog discovery', () => {
  it('exhausts next pages, authenticates without redirects and deduplicates exact IDs', async () => {
    const fetchImpl = vi
      .fn<CatalogFetch>()
      .mockResolvedValueOnce(
        response({ data: [{ id: 'a', name: 'Alpha' }], links: { next: '?offset=1' }, total_count: 3 }),
      )
      .mockResolvedValueOnce(response({ data: [{ id: 'a' }, { id: 'b' }], total_count: 3 }))
    const result = await loadModelCatalog(endpoint, 'fixture-key', signal(), fetchImpl)
    expect(result).toEqual([
      { id: 'a', name: 'Alpha' },
      { id: 'b', name: 'b' },
    ])
    expect(fetchImpl.mock.calls[1]?.[0]).toBe(`${endpoint}/models?offset=1`)
    expect(fetchImpl.mock.calls[0]?.[1]).toMatchObject({
      redirect: 'error',
      headers: { Authorization: 'Bearer fixture-key' },
    })
    expect(searchModels(result, 'ALP')).toEqual([result[0]])
    expect(searchModels(result, 'B')).toEqual([result[1]])
  })
  it('exhausts explicit cursor pages', async () => {
    const get = vi
      .fn<CatalogFetch>()
      .mockResolvedValueOnce(response({ data: [{ id: 'one' }], has_more: true, last_id: 'one' }))
      .mockResolvedValueOnce(response({ data: [{ id: 'two' }], has_more: false }))
    expect(await loadModelCatalog(endpoint, '', signal(), get)).toHaveLength(2)
    expect(get.mock.calls[1]?.[0]).toBe(`${endpoint}/models?after=one`)
  })
  it.each(['https://other.example/models', '/other', `${endpoint}/models`, '?offset=1#fragment'])(
    'rejects unsafe/looping next %s before forwarding the key',
    async (next) => {
      const get = vi.fn<CatalogFetch>().mockResolvedValue(response({ data: [{ id: 'x' }], links: { next } }))
      await expect(loadModelCatalog(endpoint, 'fixture', signal(), get)).rejects.toThrow()
      expect(get).toHaveBeenCalledTimes(1)
    },
  )
  it.each([
    { data: [{ id: '' }] },
    { data: [], total_count: 2 },
    { data: [{ id: 'x' }], has_more: true },
    { data: 'bad' },
  ])('rejects malformed or incomplete catalogs and retains complete cache', async (body) => {
    const saved = [{ id: 'saved', name: 'Saved' }]
    catalogCache.set(endpoint, saved)
    await expect(loadModelCatalog(endpoint, '', signal(), async () => response(body))).rejects.toThrow()
    expect(catalogCache.get(endpoint)).toBe(saved)
  })
  it('keeps empty successful catalogs distinct from failures', async () => {
    expect(await loadModelCatalog(endpoint, '', signal(), async () => response({ data: [] }))).toEqual([])
    await expect(
      loadModelCatalog(endpoint, '', signal(), async () => ({ ...response({}), ok: false, status: 401 })),
    ).rejects.toThrow('authorized')
  })
  it('does not cache a response that arrives after cancellation', async () => {
    const controller = new AbortController()
    const saved = [{ id: 'saved', name: 'Saved' }]
    catalogCache.set(endpoint, saved)
    const get: CatalogFetch = async () => {
      controller.abort()
      return response({ data: [{ id: 'late' }] })
    }
    await expect(loadModelCatalog(endpoint, '', controller.signal, get)).rejects.toThrow('cancelled')
    expect(catalogCache.get(endpoint)).toBe(saved)
  })
})
