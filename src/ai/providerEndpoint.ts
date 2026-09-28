export const DEFAULT_PROVIDER_ENDPOINT = 'https://openrouter.ai/api/v1'

export function normalizeProviderEndpoint(value = ''): string {
  const text = value.trim()
  if (!text) return DEFAULT_PROVIDER_ENDPOINT
  const url = new URL(text)
  if (
    url.protocol !== 'https:' ||
    !url.hostname ||
    url.username ||
    url.password ||
    url.href.includes('?') ||
    url.href.includes('#')
  ) {
    throw new Error('Use an absolute HTTPS base URL without credentials, query or fragment.')
  }
  url.pathname = url.pathname.replace(/\/+$/, '')
  if (/\/(chat\/completions|models)$/i.test(url.pathname)) {
    throw new Error('Enter the API base URL; /chat/completions and /models are appended automatically.')
  }
  return url.toString().replace(/\/+$/, '')
}

export function providerRoute(endpoint: string | undefined, route: 'models' | 'chat/completions'): string {
  return `${normalizeProviderEndpoint(endpoint)}/${route}`
}

/** Use Expo's native redirect enforcement even when RN's global fetch is overridden. */
export async function providerFetch(url: string, init: RequestInit): Promise<Response> {
  const { fetch } = await import('expo/fetch')
  return fetch(url, { ...init, redirect: 'error' })
}
