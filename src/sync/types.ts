/**
 * The remote object store the engine reconciles against. It is keyed by bare
 * object name; the adapter owns any prefix or bucket and all path safety.
 */
export interface SyncRemote {
  listNames(): Promise<string[]>
  readText(name: string): Promise<string>
  writeText(name: string, content: string): Promise<void>
  deleteText(name: string): Promise<void>
}

export interface SyncReport {
  uploaded: number
  downloaded: number
  /** Objects that could not be treated as a valid conversation on either side. */
  skipped: number
  manifestUploaded: boolean
}

/** Whether sync can run and what the last run did. `error` is a host error code. */
export type SyncState = 'disabled' | 'idle' | 'pending' | 'syncing' | 'error'
