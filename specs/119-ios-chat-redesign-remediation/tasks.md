# Tasks: iOS Chat Redesign Remediation

## Phase 1: Shared Component

- [x] T001 Add `showScrollToLatest` hysteresis to `useAtBottom` (`../app-20-llmchat/src/hooks/useAtBottom.ts`) and unit tests in `useAtBottom.test.ts`. Show above the show threshold, hide at or below the follow threshold, retain between.
- [x] T002 Add `scrollToLatestShowThreshold`, `listTrailingPadding`, and `scrollToLatestAnnouncement` to `MessageList` (`../app-20-llmchat/src/components/LLMChat.Conversation.tsx`). Render the overlay from `showScrollToLatest`, apply trailing padding to the list content, and announce on explicit activation when a screen reader is enabled. Add `useScreenReaderEnabled`.
- [x] T003 Recompute latest-control distance on viewport layout and content size changes, not only on scroll (`LLMChat.Conversation.tsx`).
- [x] T004 Add `focusRequest` to `Composer` (`../app-20-llmchat/src/components/LLMChat.PromptInput.tsx`) and forward the new props through `Chat` (`LLMChat.Root.tsx`).
- [x] T005 Extend component tests: hysteresis in `LLMChat.Conversation.test.tsx`, trailing padding, announcement, and focus request. Run `lint`, `typecheck`, `test` in `../app-20-llmchat`.
- [x] T006 Push the component branch `spec-119-ios-chat-redesign-remediation` in `../app-20-llmchat` and record the commit hash.

## Phase 2: Dependency Integration

- [x] T007 Add `@expo/ui` (57.0.19) to `apps/ios/package.json` and repin `app-20-llmchat` to the T006 commit. Run `npm install` and confirm `npm ls app-20-llmchat` is clean.
- [x] T008 Update `apps/ios/app.json` plugins if `@expo/ui` requires a config plugin.

## Phase 3: Composer and Edit-and-Resend Recovery

- [x] T009 Derive conversation `updatedAt` from message activity in `apps/ios/src/chat/conversation.ts`; add `conversation.test.ts` covering draft-only saves, renames, and new messages (FR-006).
- [x] T010 Implement failed-send rollback and draft/focus restore in `apps/ios/src/chat/IosChatScreen.tsx` (FR-002).
- [x] T011 Pass `readOnly` while a send is pending and keep edit actions disabled (FR-003).
- [x] T012 Focus the composer and announce edit mode on entering edit-and-resend; include a source excerpt in the edit action accessibility label (FR-015).
- [x] T013 Retain edit mode and edited text on a failed resend; restore the parked draft only on success or cancel (FR-016).

## Phase 4: History

- [x] T014 Restore the header New chat control and keep Settings in the history drawer footer (FR-004).
- [x] T015 Render the model selector as a native `@expo/ui` menu with the selected entry checked (FR-004).
- [x] T016 Add drawer loading state, make the list scrollable, move the Settings footer out of absolute positioning, and allow title wrap at accessibility text sizes (FR-007).
- [x] T017 Re-present the rename alert with the validation message on invalid input (FR-008).

## Phase 5: Settings and Import

- [x] T018 Retain the settings draft across close and reopen, including after a failed write; keep the retry row (FR-009, FR-010).
- [x] T019 Flush every field on blur and keyboard Done; add `automaticallyAdjustKeyboardInsets` to the form (FR-011).
- [x] T020 Mask revealed secrets when the app leaves the foreground (FR-012).
- [x] T021 Detect duplicate JSON property names and reject invalid provided values in `settingsImport.ts`; validate the merged candidate before mutating the draft (FR-013, FR-014). Extend `settingsImport.test.ts`.

## Phase 6: Transcript Wiring

- [x] T022 Pass `followThreshold={40}`, `scrollToLatestShowThreshold={80}`, and `listTrailingPadding={68}` to `LLMChat.Root`; hide the chat from accessibility traversal while a modal is open (FR-017, FR-018, FR-019).
- [x] T023 Broaden keyboard tracking to `keyboardWillChangeFrame` and `keyboardWillHide` as the single keyboard owner (FR-005).

## Phase 7: Local-First Mirror

- [x] T024 Rewrite `MirrorQueue.flush` to drain until empty and deliver a superseding revision; make `run` re-run when operations remain (`apps/ios/src/sync/mirrorQueue.ts`). Extend `mirrorQueue.test.ts` (FR-020, FR-022, FR-023).
- [x] T025 Resume pending remote operations on mount when a complete S3 configuration exists (FR-021).

## Phase 8: Verification and Archival

- [x] T026 Run `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run test:e2e` in this repository; record results.
- [x] T027 Run `lint`, `typecheck`, and `test` in `../app-20-llmchat`; record results.
- [x] T028 Record native acceptance for states 01-35 (FR-025) as blocked with the environment reason. Do not mark any state passed without evidence.
- [x] T029 Archive `118-agent-device-acceptance`: `git mv` to `specs/archive/` and set `**Status**` to `Archived`.
- [x] T030 Open the PR with the review-required headings and attribution.
- [x] T031 Pin the shared composer newline-growth fix at `3b73b67` after registry publication was unavailable.

## Phase 9: Audit Remediation

- [x] T032 Make mirror revisions monotonic across application restart and add the persisted-queue supersession test (FR-022).
- [ ] T033 Implement import loading, interaction locking, and success status only after persistence completes; add SettingsSheet recovery tests (FR-009, FR-013, FR-014, FR-024).
- [ ] T034 Keep focused Settings fields and helpers 16 points above the keyboard, use the URL keyboard for Endpoint, and add coverage (FR-011).
- [ ] T035 Correct the drawer safe-area footer, keyboard-open composer gap, history retry icon, and Dynamic Type layouts (FR-001, FR-005, FR-007).
- [ ] T036 Replace the rename validation approximation with a native flow that disables invalid Save actions (FR-008).
- [x] T037 Add one blocked or evidenced acceptance record for each required design state (01-35) (FR-025). See `acceptance-records.md`.
- [ ] T038 Define and implement app-specific e2e commands and iOS interaction coverage; do not route iOS work through Electron Playwright tests (FR-024). Initial Maestro coverage is at `tests/e2e/ios/chat.yaml`; execution remains blocked pending a native device runner.

## Verification record

- T006 completed: `../app-20-llmchat` branch `spec-119-ios-chat-redesign-remediation` pushed at `fffad3f41b30186804fab7dcc0935f5102c941c7`, merged as `22aa15c`, and published as `1.0.80`. `apps/ios` now depends on `1.0.80` from the registry.
- T026 completed: in app-20, `npm run lint`, `npm run typecheck`, and `npm run test` (270 tests) passed. `npm run test:e2e` passed with 71 tests.
- T027 completed together with T006.
- T028 is blocked: native acceptance for states 01-35 requires an iOS build on macOS or a device. This environment is Windows with no local iOS simulator or device, and EAS Simulator was unavailable for the account (spec 109 verification record). No state is recorded as passed.
- T029 completed: PR opened.
- Post-fix verification: `npm run test --workspace @app-20/ios` (30 tests), `npm run typecheck --workspace @app-20/ios`, `npm run lint`, `npm run typecheck`, `npm run test` (270 tests), and `npm run test:e2e` (71 tests) passed. The shared component's composer test, typecheck, lint, and build passed before it was pinned at `3b73b67`.

## Review remediation

Five agent-based reviews were run against PR #44. The following reviewed findings were fixed:

- FR-016 failed resend now restores the edited text and refocuses the composer.
- FR-004 model selector is wrapped in the `@expo/ui` `Host`.
- FR-002 failed-send retry works; the shared component clears its duplicate-submit guard when the host replaces the controlled value (`../app-20-llmchat` PR #9, republished).
- FR-005 keyboard inset is measured on an un-inset wrapper, so interactive dismissal no longer oscillates.
- FR-007 the drawer opens before loading, so its loading state is reachable.
- FR-019 the chat is hidden from accessibility traversal while a modal is open, and the latest control animates a nearby jump with a Reduce Motion immediate jump and drag interrupt.
- FR-015 the edit action accessibility label includes a source excerpt.
- FR-024 adds `sendRecovery.test.ts` and import, ordering, and mirror coverage.
- Minor: settings writes chain past a failed write; an active rename updates the in-memory base; import rejects unicode-escaped and inherited-name duplicates and bounds scanner depth; the merged import candidate is validated before the draft changes.
- `581c4e5` prevents a late settings hydration from overwriting editable input, serializes imports, cancels stale scheduled saves before import, corrects the native rename length boundary, and fixes the Maestro Settings navigation and import control label.

The following review work remains incomplete and blocks readiness:

- [ ] T039 Add native interaction coverage for the remaining FR-024 recovery paths and run it against an iOS development build.
- [ ] T040 Add or provide a macOS iOS runner for the required Maestro and native acceptance checks.
