import { ProviderError } from './errors'

export interface ByteStreamReader {
  read(): Promise<{ done: boolean; value?: Uint8Array }>
}

export interface ByteStream {
  getReader(): ByteStreamReader
}

const DATA_PREFIX = 'data:'
const MAX_LINE_BYTES = 1024 * 1024

type LineResult = { kind: 'delta'; text: string } | { kind: 'done' } | { kind: 'skip' }

function extractDelta(payload: string): string | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(payload)
  } catch {
    return null
  }
  if (parsed === null || typeof parsed !== 'object') return null

  const choices = (parsed as { choices?: unknown }).choices
  if (!Array.isArray(choices) || choices.length === 0) return null
  const choice = choices[0]
  if (choice === null || typeof choice !== 'object') return null

  const delta = (choice as { delta?: unknown }).delta
  if (delta === null || typeof delta !== 'object') return null
  const content = (delta as { content?: unknown }).content
  return typeof content === 'string' && content.length > 0 ? content : null
}

function consumeLine(line: string): LineResult {
  if (!line.startsWith(DATA_PREFIX)) return { kind: 'skip' }
  const payload = line.slice(DATA_PREFIX.length).trim()
  if (payload.length === 0) return { kind: 'skip' }
  if (payload === '[DONE]') return { kind: 'done' }

  const text = extractDelta(payload)
  return text === null ? { kind: 'skip' } : { kind: 'delta', text }
}

/**
 * Reads an OpenAI-compatible SSE body and yields each non-empty assistant text
 * delta. Blank lines, comments, and lines whose JSON has no string delta are
 * skipped so one bad chunk cannot corrupt output already rendered. A stream
 * that ends before `[DONE]` is a dropped connection (spec 102 edge case).
 */
export async function* parseOpenRouterStream(body: ByteStream): AsyncIterable<string> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let finished = false

  while (!finished) {
    let result: { done: boolean; value?: Uint8Array }
    try {
      result = await reader.read()
    } catch {
      throw new ProviderError('network')
    }
    if (result.done) break

    buffer += decoder.decode(result.value ?? new Uint8Array(), { stream: true })
    if (buffer.length > MAX_LINE_BYTES) throw new ProviderError('network')

    let newline = buffer.indexOf('\n')
    while (newline !== -1) {
      const line = buffer.slice(0, newline).replace(/\r$/, '')
      buffer = buffer.slice(newline + 1)

      const outcome = consumeLine(line)
      if (outcome.kind === 'done') {
        finished = true
        break
      }
      if (outcome.kind === 'delta') yield outcome.text

      newline = buffer.indexOf('\n')
    }
  }

  if (!finished) throw new ProviderError('network')
}
