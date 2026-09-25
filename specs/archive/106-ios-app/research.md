# Research: iOS App

## R1: Feature ordering

**Decision**: Implement specs 107 and 108 separately before spec 106.

**Rationale**: Spec 106 requires their behavior but does not own desktop autosave or the shared key-gate policy. Separate branches preserve the spec-first workflow and let iOS consume stable session interfaces from `main`.

**Evidence**: `spec.md` FR-008 and FR-009 require specs 107 and 108. Both source specs are draft and have no plan or task artifacts.

## R2: Native host boundary

**Decision**: Add `apps/ios` as an Expo application that supplies native adapters to the existing platform-neutral storage and sync packages.

**Rationale**: `@app-20/conversation-storage` accepts a `ConversationFilePort`, and `@app-20/sync` accepts a `SyncRemote`. Reusing those ports keeps schemas and reconciliation identical across platforms without importing Electron or Node in iOS.

**Evidence**: `packages/conversation-storage/src/store.ts` and `packages/sync/src/types.ts` define the two host ports. The constitution requires Expo React Native on iOS.

## R3: Native device services

**Decision**: Use Expo-managed APIs for the document picker, secure credential storage, sandboxed files, app lifecycle, and safe areas. Install compatible package versions through `npx expo install` after the Expo SDK is initialized.

**Rationale**: These services must run natively and no dependency versions are currently pinned for Expo. Expo's installer selects versions compatible with the generated SDK.

**Evidence**: The repository has no Expo application or EAS configuration. `npm view expo` reported version `57.0.22` on 2026-09-11, but its peer dependency range does not establish a compatible SDK set for this repository.

## R4: S3 adapter

**Decision**: Evaluate an Expo-compatible SigV4 S3 client before implementation. The selected client must sign requests locally, keep credentials in secure storage, and expose only the `SyncRemote` operations.

**Rationale**: The desktop `@aws-sdk/client-s3` adapter relies on its Node/Electron environment. The native dependency must be verified against Metro rather than assumed compatible. EAS build verification is deferred until App Store readiness work begins.

**Evidence**: `apps/electron/src/main/s3Remote.ts` is desktop-specific. The shared engine has no AWS dependency.

## R5: Validation

**Decision**: Use manual local verification through Expo Go on an iPhone connected to `npm run dev:ios`. Defer automated testing, EAS build validation, physical-iPhone acceptance testing, Apple Developer Program enrollment, and App Store work until a later readiness spec.

**Rationale**: The current Playwright configuration launches Electron only. It cannot operate a physical iPhone or prove native keyboard, IME, safe-area, selection, and dynamic-type behavior. The current host is an early beta implementation and manual local use provides sufficient feedback while usability is still evolving.

**Evidence**: `playwright.config.ts` and `tests/e2e/launch-shell.ts` are Electron-only. EAS Simulator is not enabled for the current Expo account as of 2026-09-13, and the existing GitHub Actions quality job runs on Windows.
