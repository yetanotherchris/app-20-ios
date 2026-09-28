import {
  DEFAULT_PROVIDER_ENDPOINT,
  normalizeProviderEndpoint,
  providerFetch,
  providerRoute,
} from '../ai/providerEndpoint'

export interface CatalogModel {
  id: string
  name: string
}
export type CatalogFetch = (
  url: string,
  init: RequestInit,
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>
export const catalogCache = new Map<string, readonly CatalogModel[]>()

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function searchModels(models: readonly CatalogModel[], query: string): readonly CatalogModel[] {
  const text = query.toLowerCase()
  return models.filter((model) => model.id.toLowerCase().includes(text) || model.name.toLowerCase().includes(text))
}

export async function loadModelCatalog(
  endpoint: string,
  apiKey: string,
  signal: AbortSignal,
  fetchImpl: CatalogFetch = providerFetch,
): Promise<readonly CatalogModel[]> {
  const base = normalizeProviderEndpoint(endpoint)
  const route = new URL(providerRoute(base, 'models'))
  if (base === DEFAULT_PROVIDER_ENDPOINT) route.searchParams.set('output_modalities', 'all')
  let next: string | null = route.href
  const visited = new Set<string>()
  const models = new Map<string, CatalogModel>()
  let received = 0
  let total: number | undefined
  while (next) {
    if (signal.aborted) throw new Error('Catalog request cancelled.')
    const url: URL = new URL(next, route)
    if (
      url.origin !== route.origin ||
      url.pathname !== route.pathname ||
      url.username ||
      url.password ||
      url.hash ||
      visited.has(url.href)
    ) {
      throw new Error('The catalog returned unsafe or repeated pagination. Add a model manually or retry.')
    }
    visited.add(url.href)
    const response = await fetchImpl(url.href, {
      method: 'GET',
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
      signal,
      redirect: 'error',
    })
    if (!response.ok)
      throw new Error(
        response.status === 401 || response.status === 403
          ? 'Model discovery was not authorized. Check the API key and retry.'
          : 'Model discovery failed. Retry or add an exact identifier manually.',
      )
    const body = await response.json()
    if (!record(body) || !Array.isArray(body.data)) throw new Error('The provider returned an invalid model catalog.')
    for (const entry of body.data) {
      if (
        !record(entry) ||
        typeof entry.id !== 'string' ||
        !entry.id.trim() ||
        (entry.name !== undefined && typeof entry.name !== 'string')
      ) {
        throw new Error('The provider returned an invalid model catalog.')
      }
      if (!models.has(entry.id))
        models.set(entry.id, {
          id: entry.id,
          name: typeof entry.name === 'string' && entry.name ? entry.name : entry.id,
        })
    }
    received += body.data.length
    if (body.total_count !== undefined) {
      if (
        typeof body.total_count !== 'number' ||
        !Number.isSafeInteger(body.total_count) ||
        body.total_count < 0 ||
        (total !== undefined && body.total_count !== total)
      ) {
        throw new Error('The provider returned invalid pagination metadata.')
      }
      total = body.total_count
    }
    if (body.links !== undefined && !record(body.links))
      throw new Error('The provider returned invalid pagination metadata.')
    const link = record(body.links) ? body.links.next : body.next
    if (link !== undefined && link !== null && typeof link !== 'string')
      throw new Error('The provider returned invalid pagination metadata.')
    if (body.has_more !== undefined && typeof body.has_more !== 'boolean')
      throw new Error('The provider returned invalid pagination metadata.')
    next = typeof link === 'string' && link ? new URL(link, url).href : null
    if (!next && body.has_more === true) {
      if (typeof body.last_id !== 'string' || !body.last_id || !body.data.length)
        throw new Error('The model catalog is incomplete.')
      const cursor: URL = new URL(url)
      cursor.searchParams.set('after', body.last_id)
      next = cursor.href
    }
    if (next && body.data.length === 0) throw new Error('The model catalog is incomplete.')
  }
  if (total !== undefined && received !== total)
    throw new Error('The model catalog is incomplete. Retry or add models manually.')
  if (signal.aborted) throw new Error('Catalog request cancelled.')
  const result = [...models.values()]
  catalogCache.set(base, result)
  return result
}
