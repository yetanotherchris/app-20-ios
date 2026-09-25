import { Directory, File, Paths } from 'expo-file-system'
import type { MirrorOperation, MirrorQueueStorage } from './mirrorQueue'

const QUEUE_FILE = 'mirror-queue.json'

/** Keeps pending remote operations outside conversation files and writes atomically. */
export function createMirrorQueueStorage(): MirrorQueueStorage {
  const directory = new Directory(Paths.document, 'sync')
  const destination = new File(directory, QUEUE_FILE)

  return {
    async read() {
      try {
        if (!destination.exists) return []
        const value: unknown = JSON.parse(await destination.text())
        if (!Array.isArray(value)) return []
        return value.filter(
          (entry): entry is MirrorOperation =>
            Boolean(entry) &&
            typeof entry === 'object' &&
            typeof entry.name === 'string' &&
            typeof entry.revision === 'number' &&
            (typeof entry.content === 'string' || entry.content === null),
        )
      } catch {
        return []
      }
    },
    async write(operations) {
      directory.create({ idempotent: true, intermediates: true })
      const temporary = new File(directory, `.${QUEUE_FILE}.${Date.now()}.tmp`)
      temporary.create({ overwrite: true })
      temporary.write(JSON.stringify(operations))
      await temporary.move(destination, { overwrite: true })
    },
  }
}
