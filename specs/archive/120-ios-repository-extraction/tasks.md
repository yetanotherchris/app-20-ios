# Tasks: iOS Repository Extraction

- [x] Create the standalone Expo project configuration at the repository root.
- [x] Move the iOS source and tests into `src/` and `tests/`.
- [x] Localize provider, storage, and sync modules.
- [x] Transfer iOS specifications and update active path references.
- [x] Remove the extracted iOS source and specifications from the desktop repository.
- [x] Run the standalone lint, typecheck, unit-test, and Maestro commands.

## Verification Record

- `npm run format:check`, `npm run lint`, `npm run typecheck`, and `npm run test` passed on 2026-09-25. The unit suite contains 112 tests.
- `npm run test:e2e` targets only `tests/e2e/ios`, but could not start because the Windows host does not have the Maestro CLI installed. It also requires an installed iOS development build.
