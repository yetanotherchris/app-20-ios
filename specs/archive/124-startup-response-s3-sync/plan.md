# Implementation Plan: Startup and Response S3 Synchronisation

**Branch**: `spec-121-124-settings-models-s3` | **Date**: 2026-09-27 | **Spec**: [spec.md](spec.md)

## Summary

Add a destination-bound durable reconciliation coordinator around local conversation storage and the S3 adapter. Load local history first, reconcile on startup/configuration changes, and queue terminal response commits. Preserve conflicts, malformed objects and active-work candidates outside canonical history. Explicit resolution preserves displaced bytes before making a fresh local revision.

## Technical Context

**Language/Version**: TypeScript 6, React 19, React Native 0.86 / Expo 57.
**Primary Dependencies**: AWS SDK S3; Expo file system and protected settings; npm s3rver for local protocol tests; SHA-256 for nonsecret configuration identity.
**Storage**: Atomic app-private sync state (pending operations, holds, deferrals and recovery), existing conversation JSON and manifest; credentials remain in SecureStore.
**Testing**: Vitest unit/race tests, npm s3rver integration tests, TypeScript and ESLint; iOS acceptance requires unavailable device tooling and is recorded separately.
**Target Platform**: iOS mobile app; Linux validation.
**Performance Goals**: Local history and sending never await network; no overlapping reconciliation; unchanged snapshots incur no object writes.
**Constraints**: Existing conversations/ prefix and JSON/manifest contracts; no secrets in persisted sync state or diagnostics; all listing pages; strict RFC3339 comparisons including submillisecond precision.
**Scale/Scope**: Existing history, response lifecycle, settings help and conflict actions; no background scheduling or tombstones.

## Constitution Check

The constitution is an unratified placeholder, so imposes no concrete additional principles. Root AGENTS.md governs review, preservation, validation and archiving. Pre-design and post-design gates pass: preserve existing work, independent planning review before coding, three independent implementation reviews, npm S3 validation and explicit device limits.

## Project Structure

- `src/sync/reconciliation.ts`: coordinator, persistence contract and generation fencing.
- `src/sync/revision.ts`: strict timestamp and semantic revision comparisons.
- `src/sync/reconciliationFile.ts`: atomic private state persistence.
- `src/sync/syncService.ts`: native coordinator adapter.
- `src/sync/engine.ts`: shared safe one-shot reconciliation entry point.
- `src/chat/IosChatScreen.tsx`: startup, local mutation coordination, active-work state, refreshed history and resolution UI.
- `src/settings/SettingsSheet.tsx`: destination-switch help.
- `tests/sync/`: deterministic regression/race and npm S3 protocol integration tests.
- Feature artifacts: plan, research, data-model, contracts, quickstart, tasks and review; archive after remediation.

## Coordination design

Remote work uses one drain loop. Local mutation and final download acceptance use a separate short serialized local section, never a network wait. Every remote read observes a local revision and active-work generation, then rechecks before applying. Deferrals persist original local baseline and candidate bytes; local divergence converts to a durable conflict irrespective of timestamps. Active local saves and accepted downloads update live state within this local section.

Configuration identity hashes bucket/region/endpoint and credentials; raw credentials are never persisted. Explicit settings notifications immediately invalidate old results. The state binds queue, holds and deferrals to that identity. Changing configuration discards old operations and holds while preserving recovery bytes and starts complete reconciliation. Removal clears pending work. Legacy unbound uploads are replaced by fresh reconciliation. Legacy deletes migrate to conservative suppression tombstones, never executed against an unknown destination, so deleted files cannot be reimported on upgrade/relaunch. Tombstones remain private and destination-independent until a reachable sync migration action offers Confirm remote deletion or Restore remote, rechecks remote bytes and configuration, and clears that tombstone after the chosen action is durably committed. This is an explicit conservative migration exception to automatic resume because historical destination identity is unavailable. Retired holds/deferrals copy candidates into retained recovery before discard. The S3 adapter supplies original bytes for malformed-object recovery; private state stores byte arrays in addition to decoded text.

Pending deletes are applied before downloads and preserve encountered held data. Pending uploads never bypass reconciliation; latest local files determine upload bytes. Held remote manifest entries are retained while other entries progress. Resolution rechecks the presented remote bytes and active work; changed remote content requires a fresh choice. Preserve all displaced raw bytes before selecting a new UTC millisecond revision later than both competing instants.
