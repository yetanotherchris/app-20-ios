import { describe, expect, it } from 'vitest'
import { parseOpenRouterStream } from '../../src/ai/stream'
import { streamFromStrings } from '../../src/ai/testing'

function delta(content: string): string {
  return `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`
}

async function collect(source: AsyncIterable<string>): Promise<string[]> {
  const result: string[] = []
  for await (const value of source) result.push(value)
  return result
}

describe('parseOpenRouterStream', () => {
  it('yields each delta in order and stops at [DONE]', async () => {
    const chunks = [delta('Hello'), delta(' world'), 'data: [DONE]\n\n']
    expect(await collect(parseOpenRouterStream(streamFromStrings(chunks)))).toEqual(['Hello', ' world'])
  })

  it('decodes a data line split across two network chunks', async () => {
    const chunks = ['data: {"choices":[{"delta"', ':{"content":"Hi"}}]}\n\ndata: [DONE]\n\n']
    expect(await collect(parseOpenRouterStream(streamFromStrings(chunks)))).toEqual(['Hi'])
  })

  it('skips blank lines, comments, and unparseable payloads between deltas', async () => {
    const chunks = [
      '\n',
      ': comment\n',
      delta('first'),
      'data: {not json}\n\n',
      'data: {"choices":[]}\n\n',
      delta('second'),
      'data: [DONE]\n\n',
    ]
    expect(await collect(parseOpenRouterStream(streamFromStrings(chunks)))).toEqual(['first', 'second'])
  })

  it('ignores an empty content delta', async () => {
    const chunks = [delta(''), delta('real'), 'data: [DONE]\n\n']
    expect(await collect(parseOpenRouterStream(streamFromStrings(chunks)))).toEqual(['real'])
  })

  it('throws a network error when the stream ends before [DONE]', async () => {
    await expect(collect(parseOpenRouterStream(streamFromStrings([delta('partial')])))).rejects.toMatchObject({
      errorClass: 'network',
    })
  })
})
