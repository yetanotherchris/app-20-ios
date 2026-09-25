import { describe, expect, it } from 'vitest'
import {
  AUTOMATIC_MODEL,
  createOpenRouterProvider,
  OPENROUTER_ENDPOINT,
  type HttpFetch,
  type HttpFetchInit,
} from '../../src/ai/openrouter'
import { fetchReturning, streamFromStrings } from '../../src/ai/testing'

function delta(content: string): string {
  return `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`
}

async function collect(source: AsyncIterable<string>): Promise<string[]> {
  const result: string[] = []
  for await (const value of source) result.push(value)
  return result
}

const REQUEST = {
  model: AUTOMATIC_MODEL,
  messages: [{ role: 'user' as const, content: 'hi' }],
}

describe('createOpenRouterProvider', () => {
  it('posts a streaming chat request with the bearer key and parses deltas', async () => {
    const captured: { url?: string; init?: HttpFetchInit } = {}
    const fetchImpl: HttpFetch = async (url, init) => {
      captured.url = url
      captured.init = init
      return {
        ok: true,
        status: 200,
        body: streamFromStrings([delta('Hello'), delta(' there'), 'data: [DONE]\n\n']),
      }
    }

    const provider = createOpenRouterProvider({ apiKey: 'sk-secret', fetch: fetchImpl })
    const text = await collect(provider.streamChat(REQUEST, new AbortController().signal))

    expect(provider.id).toBe('openrouter')
    expect(text).toEqual(['Hello', ' there'])
    expect(captured.url).toBe(OPENROUTER_ENDPOINT)
    expect(captured.init?.method).toBe('POST')
    expect(captured.init?.headers['Authorization']).toBe('Bearer sk-secret')
    expect(captured.init?.headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(captured.init?.body ?? '{}')).toEqual({
      model: AUTOMATIC_MODEL,
      messages: REQUEST.messages,
      stream: true,
    })
  })

  it('uses an endpoint override', async () => {
    let capturedUrl = ''
    const fetchImpl: HttpFetch = async (url) => {
      capturedUrl = url
      return { ok: true, status: 200, body: streamFromStrings(['data: [DONE]\n\n']) }
    }
    const provider = createOpenRouterProvider({
      apiKey: 'k',
      endpoint: 'http://127.0.0.1:9/chat',
      fetch: fetchImpl,
    })
    await collect(provider.streamChat(REQUEST, new AbortController().signal))
    expect(capturedUrl).toBe('http://127.0.0.1:9/chat')
  })

  it('classes a non-ok response before yielding anything', async () => {
    const provider = createOpenRouterProvider({
      apiKey: 'k',
      fetch: fetchReturning({ ok: false, status: 429, chunks: [delta('ignored')] }),
    })
    await expect(collect(provider.streamChat(REQUEST, new AbortController().signal))).rejects.toMatchObject({
      errorClass: 'rate-limit',
      status: 429,
    })
  })

  it('returns quietly when the signal is already aborted', async () => {
    const controller = new AbortController()
    controller.abort()
    const provider = createOpenRouterProvider({
      apiKey: 'k',
      fetch: fetchReturning({ chunks: [delta('Hi'), 'data: [DONE]\n\n'] }),
    })
    expect(await collect(provider.streamChat(REQUEST, controller.signal))).toEqual([])
  })

  it('reports a network error when fetch rejects', async () => {
    const fetchImpl: HttpFetch = async () => {
      throw new Error('offline')
    }
    const provider = createOpenRouterProvider({ apiKey: 'k', fetch: fetchImpl })
    await expect(collect(provider.streamChat(REQUEST, new AbortController().signal))).rejects.toMatchObject({
      errorClass: 'network',
    })
  })

  it('reports a network error when the response has no body', async () => {
    const provider = createOpenRouterProvider({
      apiKey: 'k',
      fetch: fetchReturning({ body: null }),
    })
    await expect(collect(provider.streamChat(REQUEST, new AbortController().signal))).rejects.toMatchObject({
      errorClass: 'network',
    })
  })
})
