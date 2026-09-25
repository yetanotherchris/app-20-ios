import { Directory, File, Paths } from 'expo-file-system'
import { MANIFEST_FILE_NAME, isConversationFileName, type ConversationFilePort } from '.'

export interface SandboxFileSystem {
  documentDirectory: string
  makeDirectoryAsync(uri: string, options: { intermediates: boolean }): Promise<void>
  readDirectoryAsync(uri: string): Promise<string[]>
  readAsStringAsync(uri: string): Promise<string>
  writeAsStringAsync(uri: string, content: string): Promise<void>
  moveAsync(options: { from: string; to: string }): Promise<void>
  deleteAsync(uri: string, options: { idempotent: boolean }): Promise<void>
}

function createNativeFileSystem(): SandboxFileSystem {
  return {
    documentDirectory: Paths.document.uri,
    async makeDirectoryAsync(uri) {
      new Directory(uri).create({ idempotent: true, intermediates: true })
    },
    async readDirectoryAsync(uri) {
      return new Directory(uri).list().map((entry) => entry.name)
    },
    async readAsStringAsync(uri) {
      return new File(uri).text()
    },
    async writeAsStringAsync(uri, content) {
      const file = new File(uri)
      file.create({ intermediates: true, overwrite: true })
      file.write(content)
    },
    async moveAsync({ from, to }) {
      await new File(from).move(new File(to), { overwrite: true })
    },
    async deleteAsync(uri) {
      const file = new File(uri)
      if (file.exists) file.delete()
    },
  }
}

function isAllowedName(name: string): boolean {
  return name === MANIFEST_FILE_NAME || isConversationFileName(name)
}

function joinUri(directory: string, name: string): string {
  return `${directory.endsWith('/') ? directory : `${directory}/`}${name}`
}

/** Provides atomic, sandboxed file access to the platform-neutral conversation store. */
export function createConversationFilePort(
  fileSystem: SandboxFileSystem = createNativeFileSystem(),
): ConversationFilePort {
  const root = fileSystem.documentDirectory
  const directory = joinUri(root, 'conversations')

  async function ensureDirectory(): Promise<void> {
    await fileSystem.makeDirectoryAsync(directory, { intermediates: true })
  }

  function fileUri(name: string): string {
    if (!isAllowedName(name)) throw new Error('Invalid conversation file name')
    return joinUri(directory, name)
  }

  return {
    async listFileNames() {
      await ensureDirectory()
      return fileSystem.readDirectoryAsync(directory)
    },
    async readText(name) {
      await ensureDirectory()
      return fileSystem.readAsStringAsync(fileUri(name))
    },
    async writeText(name, content) {
      await ensureDirectory()
      const destination = fileUri(name)
      const temporary = joinUri(directory, `.${name}.${Date.now()}.tmp`)
      await fileSystem.writeAsStringAsync(temporary, content)
      try {
        await fileSystem.moveAsync({ from: temporary, to: destination })
      } catch (error) {
        await fileSystem.deleteAsync(temporary, { idempotent: true })
        throw error
      }
    },
    async deleteText(name) {
      await ensureDirectory()
      await fileSystem.deleteAsync(fileUri(name), { idempotent: true })
    },
  }
}
