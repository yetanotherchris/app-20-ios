# Tasks: iOS App

**Input**: Planning artifacts in `specs/archive/106-ios-app/`

## Phase 0: Prerequisites

- [x] T001 Confirm specs 107 and 108 are merged to `main`, rebase `spec-106-ios-app`, and verify their session interfaces support iOS. This task blocks all implementation work.

## Phase 1: Expo Foundation

- [x] T002 Create `apps/ios` with Expo configuration, strict TypeScript, and a safe-area root.
- [x] T003 Install native dependencies with Expo-compatible versions and prove Expo Go on an iPhone can connect to the local development server for manual testing. Defer EAS and Apple Developer Program work until a later App Store readiness spec.
- [x] T004 Add the root iOS script and workspace references required to run the local development server.

## Phase 2: Native Services

- [x] T005 Implement the sandboxed atomic `ConversationFilePort` adapter.
- [x] T006 Implement document-picker imports, validation, and secure storage for provider and S3 credentials without exposing plaintext to UI state.
- [x] T007 Implement the OpenRouter streaming client using the secure provider-key service.
- [x] T008 Select and implement an Expo-compatible signed S3 `SyncRemote`; connect it to the existing sync engine and lifecycle-aware queue.

## Phase 3: Chat Experience

- [x] T009 Implement the iOS session host using the autosave and first-send gate behavior merged from specs 107 and 108.
- [x] T010 Compose `LLMChat.Root` inside a safe-area shell with native notifications, history drawer, and sync status.
- [x] T011 Defer native adapter and session automated coverage to a later readiness spec. Use manual testing through Expo Go on an iPhone during this early-beta phase.
- [x] T015 Keep the composer above the iOS software keyboard and provide a keyboard-dismissal control without submitting the draft.
- [x] T016 Render sync state as non-interactive status and expose S3 credential import through an explicit control.
- [x] T017 Extend the local storage and S3 sync ports with validated deletion operations.
- [x] T018 Replace secondary header controls with an overflow menu and add the confirmed beta clear-conversations flow with failure reporting.

## Phase 4: Validation and Completion

- [x] T012 Defer automated quality gates and CI validation until a later readiness spec. Use manual testing through Expo Go on an iPhone during this early-beta phase.
- [x] T013 Defer native E2E, EAS build validation, the physical-iPhone checklist, Apple Developer Program enrollment, and App Store work until a later readiness spec explicitly includes them.
- [x] T014 Archive `specs/106-ios-app` in the implementation PR after all active tasks and required reviews are complete.
