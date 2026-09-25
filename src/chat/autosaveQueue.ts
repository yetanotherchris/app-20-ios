export interface AutosaveQueueOptions<Snapshot> {
  createSnapshot(): Snapshot
  saveSnapshot(snapshot: Snapshot): Promise<void>
  onFailure(error: unknown): void
  draftDebounceMs?: number
}

/** Serializes persistence while retaining only the newest requested snapshot. */
export class AutosaveQueue<Snapshot> {
  private requestedRevision = 0
  private attemptedRevision = 0
  private isWriting = false
  private lastAttemptSucceeded = true
  private timer: ReturnType<typeof setTimeout> | undefined

  constructor(private readonly options: AutosaveQueueOptions<Snapshot>) {}

  trigger(): void {
    this.requestedRevision += 1
    if (!this.isWriting) void this.write()
  }

  scheduleDraftSave(): void {
    this.cancelDraftTimer()
    this.timer = setTimeout(() => this.trigger(), this.options.draftDebounceMs ?? 2_000)
  }

  cancelDraftTimer(): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = undefined
  }

  async flush(): Promise<boolean> {
    this.cancelDraftTimer()
    this.trigger()
    while (this.isWriting) await new Promise<void>((resolve) => setTimeout(() => resolve(), 0))
    return this.attemptedRevision === this.requestedRevision && this.lastAttemptSucceeded
  }

  private async write(): Promise<void> {
    this.isWriting = true
    while (this.attemptedRevision < this.requestedRevision) {
      const revision = this.requestedRevision
      try {
        await this.options.saveSnapshot(this.options.createSnapshot())
        this.lastAttemptSucceeded = true
      } catch (error) {
        this.lastAttemptSucceeded = false
        this.options.onFailure(error)
      }
      this.attemptedRevision = revision
    }
    this.isWriting = false
  }
}
