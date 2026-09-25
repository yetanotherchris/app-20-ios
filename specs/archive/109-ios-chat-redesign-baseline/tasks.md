# Tasks: iOS Chat Redesign Baseline

## Phase 1: Shared Persistence Foundations

- [x] T001 Add targeted conversation rename/delete operations and tests in `packages/conversation-storage/src`.
- [x] T002 Preserve explicit conversation titles through iOS autosave conversion and add tests in `apps/ios/src/chat`.
- [x] T003 Replace import-only secret access with protected settings snapshot read/write APIs and tests in `apps/ios/src/secrets`.
- [x] T004 Add pure settings validation, serialized autosave, and import parsing modules with unit tests in `apps/ios/src/settings`.
- [x] T005 Add a revision-aware local-first S3 mirror queue with retry and tests in `apps/ios/src/sync`.

## Phase 2: Shared Chat Component

- [x] T006 Create matching `spec-109-ios-chat-redesign` changes in `../app-20-llmchat` for the two-row composer, pending state, and input focus API.
- [x] T007 Add the right-aligned user edit action with selected, disabled, and accessible source-excerpt state in `../app-20-llmchat`.
- [x] T008 Add normalized latest-message distance, hysteresis, anchors, presentation, and accessibility behavior in `../app-20-llmchat`.
- [x] T009 Link the iOS workspace to the local shared package and verify the component build is consumed.

## Phase 3: iOS Surfaces

- [x] T010 Recompose `IosChatScreen` with the safe-area header, model picker, designed composer stack, keyboard frame layout, missing-key entry, and send recovery.
- [x] T011 Implement the full-screen history drawer, five-row list states, native rename/delete flows, and Settings entry.
- [x] T012 Implement the Settings sheet, secret visibility lifecycle, keyboard focus scrolling, status and retry behavior.
- [x] T013 Connect document picker import lifecycle to the Settings draft and persistence pipeline.
- [x] T014 Implement per-conversation edit-and-resend state and append-only resend behavior.
- [x] T015 Connect the latest-message control to composer-stack placement, keyboard layout, modal visibility, and transcript state.
- [x] T016 Replace generic sync status with local-first destination failure banner and explicit remote retry.

## Phase 4: Verification

- [x] T017 Add iOS unit tests for all new pure logic and failure paths.
- [x] T018 Run typecheck, lint, and tests in both repositories.
- [ ] T019 Perform and record native acceptance checks for states 01-35 at required widths and Dynamic Type. Not performed in the current Windows environment because no iOS validation environment is available.
- [x] T020 Archive 109 and its completed implementation specifications in the archival PR.
- [x] T021 Run `npm run test:e2e` and record the result.

## Verification record

- T018 completed on 2026-09-23: `npm run typecheck`, `npm run lint`, and `npm test` passed in app-20 and `../app-20-llmchat`.
- T019 is not complete: EAS Simulator is unavailable for the authenticated Expo account, and this Windows environment has no local iOS simulator or device.
- T021 completed on 2026-09-23: `npm run test:e2e` passed with 71 Electron Playwright tests.
- T020 completed on 2026-09-23: 109 and implementation specifications 110 through 116 were archived by user direction. T019 remains incomplete.
