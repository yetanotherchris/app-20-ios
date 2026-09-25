# Research: iOS Chat Redesign Baseline

## R1: Shared package boundary

**Decision**: Change the shared `app-20-llmchat` package for native message-cell, composer, and transcript behavior, then consume that checked-out package from the iOS workspace during implementation.

**Evidence**: The current root only accepts controlled messages, draft, status, and generic render slots. Its composer is horizontal, owns its input ref, enables send based solely on draft content, and replaces Send with Stop while pending. The current transcript exposes no measured distance, anchor, or caller-controlled latest behavior. `apps/ios` currently consumes `app-20-llmchat` from npm.

**Rejected**: Rebuilding message rendering in `apps/ios`. This would contradict the unchanged assistant-rendering requirement and duplicate shared rendering behavior.

## R2: Targeted history mutation

**Decision**: Add `rename` and `delete` to conversation storage and preserve an explicit title on subsequent saves.

**Evidence**: The store currently supports save, list, read, clear, and reconcile only. Titles are derived during conversion from the first user prompt, so a screen-only rename would be lost on the next autosave.

**Rejected**: Editing manifest files from the drawer. This would duplicate storage validation and bypass the atomic store boundary.

## R3: Settings snapshots

**Decision**: Store protected API and complete S3 values separately, while retaining an incomplete S3 form only as an in-session settings draft.

**Evidence**: The S3 destination activates only with all required values. The design requires a partially entered group to remain visible without overwriting an existing complete configuration.

**Rejected**: Persisting partial S3 JSON. It risks having subsequent sync code interpret incomplete credentials as usable state.

## R4: Import transaction

**Decision**: Parse and validate a selected file into a candidate patch before merging it into settings state or writing protected storage.

**Evidence**: The file contract rejects malformed, oversized, duplicate, unknown, or invalid inputs with no partial replacement. Existing import methods write directly after validating a single credential type.

**Rejected**: Incremental line-by-line writes. A late parse error could leave credentials partially changed.

## R5: S3 recovery

**Decision**: Queue remote operations after successful local persistence, keyed by conversation revision, and retain the latest failed operation for an explicit retry.

**Evidence**: Current full synchronization reports generic state and does not model targeted deletion. It cannot satisfy a retry that mirrors a completed local mutation without resending a provider prompt.

**Rejected**: Treating full synchronization failure as the chat banner. It does not identify local success, order revisions, or safely mirror individual deletes.
