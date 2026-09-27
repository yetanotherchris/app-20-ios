/** Thrown by a remote adapter when an object is absent, so the engine can tell a miss from a failure. */
export class RemoteMissingError extends Error {
  constructor(name: string) {
    super(`Remote object not found: ${name}`)
    this.name = 'RemoteMissingError'
  }
}

/** A conditional object mutation lost a race; re-read instead of replacing newer data. */
export class RemotePreconditionError extends Error {
  constructor() {
    super('S3 revision changed.')
    this.name = 'RemotePreconditionError'
  }
}
