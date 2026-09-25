export type ProviderErrorClass = 'invalid-key' | 'rate-limit' | 'network' | 'unknown'

export class ProviderError extends Error {
  readonly errorClass: ProviderErrorClass
  readonly status: number | undefined

  constructor(errorClass: ProviderErrorClass, status?: number) {
    super(`Provider request failed: ${errorClass}`)
    this.name = 'ProviderError'
    this.errorClass = errorClass
    this.status = status
  }
}

export function classifyHttpStatus(status: number): ProviderErrorClass {
  if (status === 401 || status === 403) return 'invalid-key'
  if (status === 429) return 'rate-limit'
  return 'unknown'
}
