import { describe, expect, it } from 'vitest'
import { classifyHttpStatus, ProviderError } from '../../src/ai/errors'

describe('classifyHttpStatus', () => {
  it('classes authentication and authorization failures as invalid-key', () => {
    expect(classifyHttpStatus(401)).toBe('invalid-key')
    expect(classifyHttpStatus(403)).toBe('invalid-key')
  })

  it('classes throttling as rate-limit', () => {
    expect(classifyHttpStatus(429)).toBe('rate-limit')
  })

  it('classes everything else as unknown', () => {
    expect(classifyHttpStatus(500)).toBe('unknown')
    expect(classifyHttpStatus(404)).toBe('unknown')
  })
})

describe('ProviderError', () => {
  it('carries its class and status', () => {
    const error = new ProviderError('rate-limit', 429)
    expect(error.errorClass).toBe('rate-limit')
    expect(error.status).toBe(429)
  })
})
