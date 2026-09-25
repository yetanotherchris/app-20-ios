export interface SettingsOperations {
  schedule(save: () => void): void
  cancelScheduledSave(): void
  beginImport(): boolean
  finishImport(): void
}

export function createSettingsOperations(delay = 600): SettingsOperations {
  let importing = false
  let timer: ReturnType<typeof setTimeout> | null = null

  function cancelScheduledSave(): void {
    if (timer) clearTimeout(timer)
    timer = null
  }

  return {
    schedule(save) {
      cancelScheduledSave()
      timer = setTimeout(() => {
        timer = null
        save()
      }, delay)
    },
    cancelScheduledSave,
    beginImport() {
      if (importing) return false
      importing = true
      cancelScheduledSave()
      return true
    },
    finishImport() {
      importing = false
    },
  }
}
