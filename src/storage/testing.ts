import type { ConversationFilePort } from './store'

export interface InMemoryConversationPort extends ConversationFilePort {
  readonly files: Map<string, string>
}

export function createInMemoryConversationPort(seed: Record<string, string> = {}): InMemoryConversationPort {
  const files = new Map<string, string>(Object.entries(seed))
  return {
    files,
    async listFileNames() {
      return [...files.keys()]
    },
    async readText(fileName) {
      const content = files.get(fileName)
      if (content === undefined) throw new Error(`missing file: ${fileName}`)
      return content
    },
    async writeText(fileName, content) {
      files.set(fileName, content)
    },
    async deleteText(fileName) {
      files.delete(fileName)
    },
  }
}
