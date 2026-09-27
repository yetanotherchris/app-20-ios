# Validation guide

From repository root install dependencies with `npm install`, then run `npm test`, `npm run typecheck`, `npm run lint`. Run `npx vitest run tests/sync/s3.integration.test.ts` for npm s3rver coverage. The test starts a loopback server on an ephemeral port with disposable disk storage and test-only credentials, creates its bucket, and closes/removes it afterward; no cloud account is needed.

Expected: remote-only startup import, local-only upload, response revisions/manifest, no redundant unchanged writes, failure retry without provider calls, all listing pages, prefix-only transfer. Deterministic tests cover pending deletes, equal/offset/fine-precision timestamps, malformed objects, durable conflict resolution/relaunch, active-work deferral/concurrent saves, and configuration fencing.

On an iOS device configure a disposable destination, launch with local history, open imported history, stream/edit/resend and retry offline. Exercise conflict choices, repair and active draft deferral; switch destinations and verify settings help. Device acceptance is separate from automated tests and must be recorded as unverified if tooling is unavailable.
