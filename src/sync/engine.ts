import type { ConversationFilePort } from '../storage'
import { ReconciliationCoordinator, type ReconciliationState } from './reconciliation'
import type { SyncRemote, SyncReport } from './types'

/** Standalone safe reconciliation. Hosts needing relaunch holds use the durable coordinator. */
export async function syncOnce(local: ConversationFilePort, remote: SyncRemote): Promise<SyncReport> {
  let value: ReconciliationState | null = null
  const coordinator = new ReconciliationCoordinator({
    local,
    config: async () => ({ bucket: 'standalone', region: 'local', accessKeyId: 'local', secretAccessKey: 'local' }),
    remote: () => remote,
    storage: {
      read: async () => value,
      write: async (next) => {
        value = next
      },
    },
  })
  await coordinator.run()
  if (coordinator.state() === 'error') throw new Error('History could not be synchronised.')
  return coordinator.report()
}
