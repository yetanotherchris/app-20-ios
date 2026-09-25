import type { HttpFetch, HttpFetchResponse } from './openrouter'
import type { ChatProvider, ChatRequest } from './provider'
import type { ByteStream } from './stream'

const encoder = new TextEncoder()

export function streamFromStrings(chunks: readonly string[]): ByteStream {
  let index = 0
  return {
    getReader() {
      return {
        async read() {
          if (index >= chunks.length) return { done: true }
          const value = encoder.encode(chunks[index] ?? '')
          index += 1
          return { done: false, value }
        },
      }
    },
  }
}

export interface FetchResponseSpec {
  ok?: boolean
  status?: number
  chunks?: readonly string[]
  body?: ByteStream | null
}

export function fetchReturning(spec: FetchResponseSpec): HttpFetch {
  const response: HttpFetchResponse = {
    ok: spec.ok ?? true,
    status: spec.status ?? 200,
    body: spec.body ?? streamFromStrings(spec.chunks ?? []),
  }
  return async () => response
}

export function createScriptedProvider(id: string, deltas: readonly string[]): ChatProvider {
  return {
    id,
    async *streamChat(_request: ChatRequest, _signal: AbortSignal) {
      for (const delta of deltas) yield delta
    },
  }
}
