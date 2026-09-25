import type { ChatProvider } from './provider'

export interface ProviderRegistry {
  register(provider: ChatProvider): void
  get(id: string): ChatProvider | undefined
  has(id: string): boolean
}

export function createProviderRegistry(initial: readonly ChatProvider[] = []): ProviderRegistry {
  const providers = new Map<string, ChatProvider>()
  for (const provider of initial) providers.set(provider.id, provider)

  return {
    register(provider) {
      providers.set(provider.id, provider)
    },
    get(id) {
      return providers.get(id)
    },
    has(id) {
      return providers.has(id)
    },
  }
}
