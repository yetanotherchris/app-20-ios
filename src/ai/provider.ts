export type ChatRole = 'system' | 'user' | 'assistant'

export interface ProviderMessage {
  role: ChatRole
  content: string
}

export interface ChatRequest {
  messages: readonly ProviderMessage[]
  model: string
}

/**
 * A chat-completions service. `streamChat` yields assistant text deltas and
 * throws `ProviderError` on failure; when `signal` aborts it returns without
 * throwing so a user stop is not reported as a failure.
 */
export interface ChatProvider {
  readonly id: string
  streamChat(request: ChatRequest, signal: AbortSignal): AsyncIterable<string>
}
