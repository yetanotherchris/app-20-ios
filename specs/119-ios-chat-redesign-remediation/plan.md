# Implementation Plan: iOS Chat Redesign Remediation

**Branch**: `spec-119-ios-chat-redesign-remediation` | **Date**: 2026-09-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/119-ios-chat-redesign-remediation/spec.md`

## Summary

Correct the iOS chat redesign defects that remain after specifications 109 through 116. The remediation restores failed-send and edit-and-resend recovery, history ordering and drawer states, settings draft retention and import atomicity, secret masking, transcript latest-control behavior, and durable local-first S3 mirroring. It touches this Expo host, the shared chat component (`app-20-llmchat`), and the pinned component dependency. The iOS host opts into the design thresholds explicitly.

## Technical Context

**Language/Version**: TypeScript 6, React 19, React Native 0.86, Expo SDK 57

**Primary Dependencies**: Expo, `@expo/ui` (new, SDK 57), Expo Constants, Expo SecureStore, Expo DocumentPicker, Expo FileSystem, `app-20-llmchat` (pinned to `3b73b67` until registry publishing is available), `@app-20/conversation-storage`, `@app-20/sync`, `@aws-sdk/client-s3`

**Storage**: One JSON conversation file plus a JSON manifest in the iOS sandbox; credentials in Expo SecureStore; pending remote operations in `sync/mirror-queue.json`

**Testing**: Vitest unit tests in `tests/` and `app-20-llmchat`. Native iOS acceptance (states 01-35) requires an iOS build and is recorded, not executed, in this environment.

**Target Platform**: iOS, iPhone 16 portrait reference frame with adaptive safe areas, keyboard, widths, and Dynamic Type

**Project Type**: Mobile application (Expo) plus a shared component library

**Constraints**: No on-disk data migration (beta). Desktop behavior must not change. Native acceptance cannot run on Windows.

**Scale/Scope**: 25 functional requirements across compose, history, settings, import, transcript, and sync; roughly 15 source files in `src/`, 4 in `app-20-llmchat`

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **I. Process Isolation**: Unaffected. The work is confined to the Expo app, the shared component, and workspace packages; no Electron preload or IPC surface changes.
- **II. Path Trust**: Unaffected. Conversation file access stays behind `ConversationFilePort` with its existing name allowlist and atomic temp-file-then-rename write.
- **III. No Data Loss**: Strengthened. Failed sends roll back the pending pair and restore the draft; failed resends retain edit mode and text; settings retain the latest draft and last complete saved configuration across close, persistence failure, and reopen; invalid imports leave the draft and saved settings unchanged; the mirror queue persists a completed local mutation before any remote attempt and resumes after relaunch.
- **IV. Fixed and Typed Preload API**: Unaffected.
- **V. Non-Negotiable Test Coverage**: Unit tests are added for every corrected pure path (ordering, import validation, settings draft retention, mirror drain and supersede). Native acceptance is blocked, not skipped, and is recorded in `tasks.md`.

No violations. Complexity Tracking records the cross-repository component change, the `@expo/ui` dependency, and the `Alert.prompt` validation approximation.

## Project Structure

### Documentation (this feature)

```text
specs/119-ios-chat-redesign-remediation/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── component-api.md
│   └── ios-modules.md
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── chat/
│   ├── IosChatScreen.tsx            # header, composer recovery, edit state, drawer, keyboard, mirror resume
│   └── conversation.ts              # activity-derived updatedAt
├── settings/
│   ├── SettingsSheet.tsx            # draft retention, blur flush, keyboard insets, background mask
│   ├── settingsImport.ts            # duplicate-key detection and value validation
│   └── settingsValidation.ts
├── storage/                          # conversation schema and local store
└── sync/
    └── mirrorQueue.ts               # drain-until-empty flush, supersede delivery

../app-20-llmchat/src/
├── hooks/useAtBottom.ts             # show/hide hysteresis
├── components/LLMChat.Conversation.tsx   # visibility, trailing padding, announcement, recompute
├── components/LLMChat.PromptInput.tsx    # focus request
└── components/LLMChat.Root.tsx      # prop pass-through
```

**Structure Decision**: The defect split determines the layer. Ordering, draft retention, import validation, mirror durability, and composer recovery are local application concerns and are fixed in `src/`. The latest-control thresholds, trailing space, and explicit-return announcement are transcript concerns owned by the shared component and are consumed through opt-in props.

## Complexity Tracking

| Violation                                      | Why Needed                                                                                                                                  | Simpler Alternative Rejected Because                                                                                                            |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Cross-repository component change              | FR-017, FR-018, and FR-019 live in the shared transcript. No available component version implements 80/40 hysteresis or the trailing space. | Implementing the transcript in `apps/ios` would duplicate and diverge from the shared renderer that spec 109 deliberately reused.               |
| `@expo/ui` dependency                          | FR-004 requires a native menu with a visibly selected entry. React Native's `ActionSheetIOS` cannot mark a selected option.                 | Hand-writing a Swift module cannot be compiled or verified in this environment and risks breaking the EAS build.                                |
| `Alert.prompt` validation approximation        | FR-008 requires validation inside the native rename flow. `Alert.prompt` cannot disable its Save button.                                    | A hand-written Swift alert module is unverifiable here; the approximation never saves an invalid title and keeps the message in a native alert. |
| Opt-in component props instead of new defaults | FR-017/FR-018 are iOS design rules; changing shared defaults would alter desktop behavior, which is out of scope.                           | Changing the component defaults to 40/80 would change the Electron and web chat surfaces without a desktop spec.                                |
