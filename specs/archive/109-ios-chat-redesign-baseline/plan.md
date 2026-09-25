# Implementation Plan: iOS Chat Redesign Baseline

**Branch**: `spec-109-ios-chat-redesign` | **Date**: 2026-09-14 | **Spec**: [spec.md](spec.md)

## Summary

Replace the early iOS shell with a native React Native composition root that presents the supplied chat, history, settings, import, edit-and-resend, latest-message, and local-first S3 recovery states. Keep conversation files and secret storage as the persistence boundaries. Extend the shared chat package only for transcript and message-cell behavior that must remain consistent with its existing renderer.

## Technical Context

**Language/Version**: TypeScript 6, React 19, React Native 0.86, Expo SDK 57

**Primary Dependencies**: Expo, Expo Constants, Expo SecureStore, Expo DocumentPicker, React Native Safe Area Context, `app-20-llmchat`, `@app-20/conversation-storage`, `@app-20/sync`

**Storage**: One JSON conversation file plus manifest in the iOS sandbox. API and S3 credentials in Expo SecureStore.

**Testing**: Vitest unit tests in shared packages and iOS. Manual iOS device or simulator acceptance checks for all 35 design states. Playwright Electron tests do not exercise Expo native surfaces.

**Target Platform**: iOS, iPhone 16 portrait reference frame with adaptive safe areas, keyboard, widths, and Dynamic Type.

## Constitution Check

- Process isolation and the Electron preload boundary are unaffected because this work is confined to the Expo application and shared persistence package.
- Conversation persistence continues to use the existing same-directory temporary-file and rename operation. Rename now preserves activity time so a title-only mutation does not reorder history.
- Credentials remain in Expo SecureStore. Imported values are parsed before they are merged into the displayed draft or persisted, and no status text includes a secret value.
- The iOS implementation has unit coverage for storage and settings parsing. Native state validation remains required because Playwright Electron tests cannot exercise Expo surfaces.

## Project Structure

```text
apps/ios/src/
├── chat/                 # Composition root, header, composer, edit state
├── history/              # Full-screen drawer and local mutations
├── settings/             # Draft validation, autosave, import, sheet
├── secrets/              # Protected settings read/write boundary
├── sync/                 # Local-first S3 mirror queue and failure state
└── storage/              # Atomic conversation file port

packages/conversation-storage/src/
└── store.ts              # Targeted rename and delete operations

../app-20-llmchat/src/
└── components/           # Native transcript, composer, and user-message action support
```

## Implementation Approach

1. Add targeted conversation rename/delete operations and preserve user-assigned titles across autosaves. The iOS history drawer uses these operations only after local persistence succeeds.
2. Replace the import-only secret service with a protected settings snapshot API. Maintain a UI draft separately from the last complete S3 configuration so partial settings never activate or overwrite S3 mirroring.
3. Build parsing, validation, and serialized settings autosave as pure modules before rendering the Settings sheet. File import parses to a complete candidate before merging it into the draft.
4. Recompose `IosChatScreen` around the designed header, composer stack, drawer, and Settings sheet. It owns per-conversation draft and edit state, keyboard frame layout, and explicit missing-key entry to Settings.
5. Extend the shared chat component on its matching feature branch for the two-row composer, user edit actions, and latest-message position behavior. Integrate the local package in the iOS app while the component release is prepared.
6. Replace generic sync status with a local-first mirror queue. It captures the latest completed local revision for retry and reports only remote destination failures through the specified banner.

## State Allocation and Verification

| Owner                    | States            | Verification                                                                       |
| ------------------------ | ----------------- | ---------------------------------------------------------------------------------- |
| Chat shell and composer  | 01-07, 27, 30     | Empty, multiline, pending, failure, model menu, long draft, and missing-key checks |
| History management       | 08-15, 26, 29     | Five-row ordering, native actions, mutation recovery, Dynamic Type                 |
| Settings and credentials | 16-20, 25, 28, 34 | Autosave, validation, retries, masking and remasking                               |
| Settings import          | 21-24             | Picker lifecycle, atomic parse failure, merge and persisted success                |
| Edit and resend          | 31                | Source selection, parked draft, append-only resend and failure recovery            |
| Latest-message control   | 32-33             | Threshold hysteresis, keyboard placement, anchors, explicit return                 |
| S3 mirror feedback       | 35                | Local save before remote failure and retry without provider request                |

## Security and Data Integrity

- Conversation writes retain the existing same-directory temporary-file and rename behavior.
- Settings mutations retain the current displayed draft on validation or protected-storage failure. Successful API writes and S3 writes are independent.
- Parsing validates the entire import before any mutation. Status text never interpolates secret values.
- A remote S3 failure cannot reverse a completed local conversation mutation or trigger a second provider request.
- Renderer and Electron IPC boundaries are unaffected.

## Complexity Tracking

| Decision                                    | Why it is needed                                                                                                                                                                        | Simpler alternative rejected                                                                                       |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Local `app-20-llmchat` package integration  | The released component API does not expose the required native composer, edit-action, and transcript behavior. The iOS app must test against the implementation used for this redesign. | Reimplementing assistant rendering in the iOS host would duplicate and diverge from the shared renderer.           |
| Separate draft and saved settings snapshots | Partial S3 entries must survive editing without replacing the last complete S3 configuration.                                                                                           | Writing each field directly to SecureStore could activate incomplete credentials or discard a valid configuration. |
| Targeted mirror queue                       | Rename/delete and retry must mirror completed local mutations without rerunning a provider request.                                                                                     | Reusing the full reconciliation pass cannot represent deletions safely or order individual conversation revisions. |
| EAS-managed build numbers                   | The Settings footer identifies the installed binary by its native build number. Development and preview profiles increment the remote iOS build number for each new binary.             | A hardcoded application version cannot distinguish successive internal builds.                                     |

## Decision log

- 2026-09-23: The user directed archival before native acceptance validation is available. T019 remains open and records the unverified states; archival does not claim that validation passed.
- 2026-09-23: Native acceptance checks cannot be performed in the current Windows environment. Windows has no supported local iOS simulator, and no iOS device is available. The feature retains this outstanding requirement until an iOS validation environment exists.
