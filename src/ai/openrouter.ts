import { ProviderError, classifyHttpStatus } from './errors'
import type { ChatProvider, ChatRequest, ProviderMessage } from './provider'
import { parseOpenRouterStream, type ByteStream } from './stream'

export const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'
export const AUTOMATIC_MODEL = 'openrouter/auto'
export const OPENROUTER_PROVIDER_ID = 'openrouter'

export interface HttpFetchInit {
  method: string
  headers: Record<string, string>
  body: string
  signal: AbortSignal
}

export interface HttpFetchResponse {
  ok: boolean
  status: number
  body: ByteStream | null
}

export type HttpFetch = (url: string, init: HttpFetchInit) => Promise<HttpFetchResponse>

export type ApiKeySource = string | (() => Promise<string | null>)

export interface OpenRouterOptions {
  apiKey: ApiKeySource
  endpoint?: string
  fetch?: HttpFetch
}

function requestBody(model: string, messages: readonly ProviderMessage[]): string {
  return JSON.stringify({ model, messages, stream: true })
}

export function createOpenRouterProvider(options: OpenRouterOptions): ChatProvider {
  const endpoint = options.endpoint ?? OPENROUTER_ENDPOINT
  const fetchImpl: HttpFetch = options.fetch ?? ((url, init) => fetch(url, init))

  async function* streamChat(request: ChatRequest, signal: AbortSignal): AsyncIterable<string> {
    const apiKey = typeof options.apiKey === 'function' ? await options.apiKey() : options.apiKey
    if (!apiKey) throw new ProviderError('invalid-key')

    let response: HttpFetchResponse
    try {
      response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: requestBody(request.model, request.messages),
        signal,
      })
    } catch {
      if (signal.aborted) return
      throw new ProviderError('network')
    }

    if (!response.ok) throw new ProviderError(classifyHttpStatus(response.status), response.status)
    if (!response.body) throw new ProviderError('network')

    try {
      for await (const delta of parseOpenRouterStream(response.body)) {
        if (signal.aborted) return
        yield delta
      }
    } catch (error) {
      if (signal.aborted) return
      if (error instanceof ProviderError) throw error
      throw new ProviderError('network')
    }
  }

  return { id: OPENROUTER_PROVIDER_ID, streamChat }
}
