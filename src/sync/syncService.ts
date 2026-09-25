import type { ConversationFilePort } from '../storage'
import { createS3Remote } from './s3Remote'
import type { SecretService } from '../secrets/secretService'
import { MirrorQueue, type MirrorOperation, type MirrorQueueState } from './mirrorQueue'
import { createMirrorQueueStorage } from './mirrorQueueFile'

export interface SyncService {
  state(): MirrorQueueState
  schedule(operation: MirrorOperation): Promise<void>
  run(): Promise<void>
  clear(): Promise<void>
}

export function createSyncService(
  _local: ConversationFilePort,
  secrets: SecretService,
  onState: (state: MirrorQueueState) => void,
): SyncService {
  let current: MirrorQueueState = 'disabled'
  const queue = new MirrorQueue(
    createMirrorQueueStorage(),
    async () => {
      const config = await secrets.getS3Config()
      return config ? createS3Remote(config) : null
    },
    (state) => {
      current = state
      onState(state)
    },
  )

  return {
    state: () => current,
    schedule: (operation) => queue.schedule(operation),
    run: () => queue.run(),
    clear: () => queue.clear(),
  }
}
