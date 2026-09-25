/** Thrown by a remote adapter when an object is absent, so the engine can tell a miss from a failure. */
export class RemoteMissingError extends Error {
  constructor(name: string) {
    super(`Remote object not found: ${name}`)
    this.name = 'RemoteMissingError'
  }
}
