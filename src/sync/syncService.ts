import type { ConversationFilePort } from '../storage'
import { createS3Remote } from './s3Remote'
import type { SecretService } from '../secrets/secretService'
import { createMirrorQueueStorage } from './mirrorQueueFile'
import { ReconciliationCoordinator, type ReconciliationOptions } from './reconciliation'
import { createReconciliationStorage } from './reconciliationFile'

export function createSyncService(
  local: ConversationFilePort,
  secrets: SecretService,
  onState: NonNullable<ReconciliationOptions['onState']>,
  callbacks: Pick<ReconciliationOptions, 'isActive' | 'workVersion' | 'onApplied' | 'onHistory' | 'onHolds'> = {},
): ReconciliationCoordinator {
  return new ReconciliationCoordinator({
    local,
    config: () => secrets.getS3Config(),
    remote: createS3Remote,
    storage: createReconciliationStorage(),
    legacyOperations: () => createMirrorQueueStorage().read(),
    onState,
    ...callbacks,
  })
}
