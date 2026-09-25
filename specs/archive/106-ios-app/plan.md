# Implementation Plan: iOS App

**Branch**: `spec-106-ios-app` | **Date**: 2026-09-11 | **Spec**: [spec.md](./spec.md)

## Summary

Create an Expo iOS application that renders `app-20-llmchat` natively and uses the shared conversation and sync packages through iOS adapters. The app provides safe-area layout, a native history drawer, document-picker credential import, secure local secrets, OpenRouter streaming, autosave and first-send behavior from specs 107 and 108, and S3 sync. Manual local testing through Expo Go on an iPhone connected to `npm run dev:ios` continues until a later App Store readiness spec changes the scope. Implementation starts only after specs 107 and 108 merge into `main`.

## Technical Context

**Language/Version**: TypeScript strict, React Native 0.86, Expo SDK 57

**Primary Dependencies**: Expo, Expo document picker, secure store, file system, safe-area context, and the AWS JavaScript S3 client through Metro's React Native/ES module resolver. Local iOS bundling proves that the selected client avoids Node imports. EAS and Apple Developer Program work are deferred until a later App Store readiness spec.

**Storage**: App-sandbox conversation JSON files and manifest through `ConversationFilePort`; credentials in the iOS secure credential store; S3 mirrors the same JSON objects through `SyncRemote`. The beta clear action deletes all valid local conversation files and manifest, then all objects below the fixed S3 conversation prefix.

**Testing**: Manual local verification through Expo Go on an iPhone connected to `npm run dev:ios`. Automated native testing, cloud-build validation, and App Store readiness testing are deferred indefinitely until a later spec defines them.

**Target Platform**: iPhone, local early-beta development

**Constraints**: No Node or Electron imports. Credentials never enter component props, notifications, logs, or persisted conversation files. Conversation writes use a same-directory temporary file followed by replacement. Native lifecycle transitions flush the autosave session before backgrounding.

## Constitution Check

| Principle               | Plan                                                                                                                                                                            | Status |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| I. Process Isolation    | iOS has no Electron renderer boundary. Native services are exposed through narrow application interfaces; chat UI receives state and callbacks, not file or secret APIs.        | PASS   |
| II. Path Trust          | The iOS file adapter receives only fixed, validated bare names from the shared store and resolves them inside the app-owned conversation directory.                             | PASS   |
| III. No Data Loss       | The file adapter writes a temporary sibling then replaces the destination. Autosave from spec 107 flushes terminal, idle-draft, and lifecycle state.                            | PASS   |
| IV. Fixed and Typed API | iOS uses typed local service interfaces. It does not add Electron preload or generic invocation APIs.                                                                           | PASS   |
| V. Test Coverage        | Manual local verification through Expo Go and `npm run dev:ios` covers this early-beta phase. Automated native and device validation are deferred until a later readiness spec. | PASS   |

## Project Structure

```text
apps/ios/
├── app.json                     # Expo and iOS bundle configuration
├── package.json                 # iOS scripts and dependencies
├── tsconfig.json
├── App.tsx                      # safe-area application composition
└── src/
    ├── chat/                    # iOS session host and shared chat mappings
    ├── storage/                 # sandboxed atomic ConversationFilePort
    ├── secrets/                 # picker import, validation, secure storage
    ├── sync/                    # SyncRemote and lifecycle queue
    ├── history/                 # history selectors and native drawer
    └── components/              # iOS shell and notifications
specs/106-ios-app/
├── contracts/ios-host.md
├── data-model.md
├── plan.md
├── quickstart.md
├── research.md
├── spec.md
└── tasks.md
```

## Implementation Sequence

1. Confirm specs 107 and 108 are merged to `main`, then rebase this branch on that commit.
2. Initialize the Expo application and use the local development server for manual verification. Defer EAS and Apple Developer Program work until a later App Store readiness spec.
3. Add storage, secrets, provider, and S3 adapters behind narrow typed interfaces. Confirm the S3 adapter through the local iOS bundle.
4. Extend the shared storage and sync ports with validated deletion operations.
5. Compose the native shell around the shared chat component, overflow menu, and history drawer.
6. Continue manual local verification. Define automated testing, cloud builds, Apple program enrollment, and App Store readiness only in a later readiness spec.

## Complexity Tracking

The native S3 transport is the only non-trivial dependency decision. The desktop adapter cannot be copied because it assumes Node. The rejected alternative is implementing S3 reconciliation in the iOS app, which would duplicate `@app-20/sync` behavior and risk divergent conflict handling. The iOS session owns equivalent local autosave and first-send orchestration because specs 107 and 108 did not expose them as a shared package. This preserves their behavior without adding an Electron dependency to the native app; extracting that policy is deferred to a dedicated structural change.
