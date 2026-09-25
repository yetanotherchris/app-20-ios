import { RemoteMissingError } from './errors'
import type { SyncRemote } from './types'

export interface InMemorySyncRemote extends SyncRemote {
  readonly objects: Map<string, string>
}

export function createInMemorySyncRemote(seed: Record<string, string> = {}): InMemorySyncRemote {
  const objects = new Map<string, string>(Object.entries(seed))
  return {
    objects,
    async listNames() {
      return [...objects.keys()]
    },
    async readText(name) {
      const content = objects.get(name)
      if (content === undefined) throw new RemoteMissingError(name)
      return content
    },
    async writeText(name, content) {
      objects.set(name, content)
    },
    async deleteText(name) {
      objects.delete(name)
    },
  }
}
