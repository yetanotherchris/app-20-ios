# Feature Specification: Startup and Response S3 Synchronisation

**Feature Branch**: `spec-121-124-settings-models-s3`
**Created**: 2026-09-26
**Status**: Draft
**Input**: User description: "Sync conversations from S3 on app startup when S3 keys exist, and sync to S3 each time a response is received."
**Depends on**: [112 Settings and Credentials](../archive/112-ios-settings-credentials/spec.md), [116 Durable Local-First S3 Mirror](../archive/116-local-first-s3-feedback/spec.md)

## Purpose

Synchronise conversations from the configured S3 destination at app startup and upload each completed assistant response after it is saved locally. Integrate the existing reconciliation capability and durable mirror queue into the app lifecycle.

## User Scenarios & Testing

### User Story 1 - Recover conversations on startup (Priority: P1)

**Independent Test**: Configure S3 with remote-only conversations, launch with local history present, and verify imported history and reconciliation.

**Acceptance Scenarios**:

1. **Given** complete S3 settings, **When** the app launches, **Then** it loads local history immediately and starts remote reconciliation after settings and local storage are ready.
2. **Given** remote-only valid conversations, **When** startup sync completes, **Then** they appear in history and can be opened without restarting.
3. **Given** missing or partial S3 settings, **When** the app launches, **Then** it remains local-only and makes no S3 requests or missing-configuration warnings.

### User Story 2 - Save each response remotely (Priority: P1)

**Independent Test**: Complete multiple responses, including an edit-and-resend, and verify local commits, remote conversation content, and the remote manifest.

**Acceptance Scenarios**:

1. **Given** configured S3, **When** an assistant response completes and saves locally, **Then** its conversation revision and history metadata are durably queued and synced to S3.
2. **Given** a streaming response, **When** individual chunks arrive, **Then** they do not each trigger a completed-response sync.
3. **Given** an S3 upload failure, **When** retry runs, **Then** it saves the latest local revision without sending the prompt again.

### User Story 3 - Preserve history through failures and conflicts (Priority: P1)

**Independent Test**: Exercise offline startup, termination with queued work, concurrent local saves during download, corrupt objects, paginated listings, and local deletion with pending remote work.

**Acceptance Scenarios**:

1. **Given** offline startup, **When** remote sync fails, **Then** local history and sending remain available with a nonblocking sync error and retry action.
2. **Given** pending remote work at termination, **When** the app relaunches with S3 available, **Then** startup reconciliation and queued writes complete without an old revision overwriting a newer one.
3. **Given** a locally deleted conversation with a queued remote delete, **When** startup sync runs, **Then** it does not resurrect the remote copy before applying that deletion.
4. **Given** different local and remote contents with equal timestamps and a pending upload, **When** sync, retry, or relaunch runs, **Then** both copies remain intact and that conversation's upload and manifest replacement stay held until explicit conflict resolution.
5. **Given** a newer remote revision arrives during an unsaved draft or streaming response, **When** the local work saves, **Then** both competing revisions remain recoverable and a conflict is shown instead of automatically overwriting either revision; relaunch preserves the unresolved conflict.
6. **Given** a newer remote revision is deferred while a conversation is active, **When** the conversation becomes idle without local changes, **Then** sync rechecks both revisions and safely applies the still-newer remote revision without requiring another cold launch.
7. **Given** an equal-timestamp conflict, **When** the user chooses to keep the local copy or use the remote copy, **Then** the chosen revision becomes active and sync resumes for that conversation only after preserving the displaced revision for local recovery.
8. **Given** a malformed remote object and a valid local copy with a queued upload, **When** sync runs, **Then** the malformed object is preserved and its replacement is held; an explicit repair choice can replace it after preserving the original bytes locally.
9. **Given** remote revisions with invalid dates or equivalent instants expressed with different offsets, **When** sync compares them, **Then** invalid dates are skipped and equivalent instants follow the equal-timestamp content comparison rule.
10. **Given** local history and pending work for destination A, **When** destination B is successfully saved, **Then** B reconciles all eligible local history as new work while A's pending operations and conflict state cannot execute against B.

### Edge Cases

- Incomplete settings, offline startup, conflicting revisions, pending deletions, corrupt objects, concurrent edits, and destination changes preserve recoverable local history.

**Priority rationale**: Startup recovery, response uploads, and failure recovery all protect conversation history.

## Requirements

### Functional Requirements

- **FR-001**: Once per cold launch, after loading settings and local storage, the app MUST initiate reconciliation when access key ID, secret access key, bucket, and region are complete and valid. The optional S3 endpoint MUST continue supporting the existing S3-compatible destination behavior.
- **FR-002**: Startup sync MUST download remote-only valid conversations and reconcile shared conversations using `updatedAt`: newer remote revisions download, newer local revisions upload, and identical revisions require no content write. Equal timestamps with different contents MUST retain the local copy and report a conflict without overwriting either copy automatically. Equality MUST compare parsed conversation data, including optional selection provenance, rather than JSON whitespace or object-key order; message order and content remain significant. Conflict holds and active-work deferrals in FR-015 and FR-016 take precedence over timestamp ordering.
- **FR-003**: Startup MUST display local history without waiting for network access. Successful downloads MUST refresh history while preserving the user's current selection, unsaved draft, and any in-progress response. A newer downloaded revision for the active conversation MUST be applied only when it cannot overwrite active local work.
- **FR-004**: Every successfully completed assistant response, including edit-and-resend responses, MUST commit locally before a durable remote write is queued. Stream chunks MUST NOT independently trigger this completed-response action; cancelled or failed responses MUST NOT be marked as successfully completed.
- **FR-005**: The completed-response trigger MUST upload the latest conversation snapshot and corresponding manifest metadata once any conflict or malformed-object hold is resolved. Existing local-first mirroring for draft saves, renames, and deletes MUST remain supported; this feature MUST NOT cause redundant writes for an unchanged revision.
- **FR-006**: Startup reconciliation and mirror operations MUST coordinate so stale queued writes or downloads cannot overwrite newer local or remote revisions. Pending deletes MUST be accounted for before remote downloads; after reconciliation, pending uploads MUST refer to the latest reconciled local revision.
- **FR-007**: The existing `conversations/` destination prefix, JSON conversation format, and `manifest.json` contract MUST remain compatible. Sync MUST enumerate every page of the remote listing and discover valid conversation objects even when the remote manifest is absent or stale.
- **FR-008**: Invalid, empty, or unsafe remote filenames and malformed conversation objects MUST be skipped with nonsecret diagnostics. Malformed remote objects MUST NOT be treated as absent or automatically repaired from local data. Reconciliation and queued writes MUST preserve their bytes and hold replacement of that object and its manifest entry. If a valid local copy exists, the user MAY explicitly choose repair from that copy after the original remote bytes have been preserved in app-private local recovery storage; invalid filenames MUST never be used as recovery paths. A corrupt local file MUST remain recoverable and MUST NOT be overwritten automatically. Remote permission, timeout, and network errors MUST NOT be interpreted as object absence.
- **FR-009**: Remote absence MUST NOT delete a local conversation. Explicit local deletes MUST continue propagating through the existing durable queue. Detecting deletes performed by other clients through tombstones is outside scope.
- **FR-010**: S3 failure MUST preserve locally committed data and show an actionable nonblocking warning. Startup-download errors MUST describe inability to sync history; upload errors MUST retain the existing `Saved on this device. Couldn’t save to S3.` feedback. Retry MUST perform sync work without resending prompts.
- **FR-011**: Pending writes and deletes MUST survive termination and resume with valid configuration, except operations held under FR-008 or FR-015. Multiple triggers MUST NOT create overlapping reconciliation runs or reorder writes to the same conversation. Retries MUST converge without duplicate conversation entries. A held conversation MUST NOT prevent other eligible conversations from syncing.
- **FR-012**: Removing S3 configuration MUST stop future remote work and discard pending operations as required by spec 116, preserving local and remote data. Changing the bucket, region, endpoint, or credentials MUST isolate old work so it cannot be sent to the new destination; a newly complete configuration MUST initiate reconciliation against that destination.
- **FR-013**: Sync MUST transfer only conversation data and its manifest. Provider keys, S3 credentials, and settings documents MUST NOT be uploaded or exposed in errors or logs.
- **FR-014**: Sync MAY run only while the app has execution time. Relaunch and existing foreground retry behavior MUST resume interrupted work; suspended-app execution and background scheduling are not required.
- **FR-015**: Unresolved conflicts MUST durably hold all automatic uploads and downloads for that conversation and destination, including pre-existing queued uploads and later local saves, across retry and relaunch. Remote manifest updates MUST preserve the held entry instead of substituting local metadata; updates for other entries MAY continue. The UI MUST offer `Keep local` and `Use remote`, preserve the displaced revision in app-private local recovery storage before replacement, and require active local work to finish or be explicitly discarded before resolution. Resolution MUST recheck the remote revision; if it changed since the choice was presented, a fresh choice is required. A resolved revision MUST have a new `updatedAt` later than both valid competing instants, commit locally, and replace obsolete queued uploads before sync resumes. Merely retrying or editing locally MUST NOT clear the hold. An explicit local delete MAY supersede the hold and continue through the durable delete queue after preserving available competing data for recovery.
- **FR-016**: A download for a conversation with unsaved local edits, pending local saves, or an in-progress response MUST be deferred outside its canonical local conversation file and live chat state. Before accepting a download, sync MUST compare the current local revision and active work against those observed before the remote read. It MUST durably preserve the candidate and deferral information before recording progress. When local work finishes or is discarded, and on relaunch or retry, sync MUST recheck both sides. If local content changed since the candidate was discovered, differing revisions MUST become a conflict under FR-015 regardless of timestamp order; otherwise the still-newer remote revision MUST apply once no active local work or hold remains. A changed remote revision MUST be reevaluated rather than applying a stale candidate. Application and local saves MUST coordinate so an old in-memory snapshot cannot overwrite an accepted download. Deferred and recovery copies MUST not appear as duplicate history entries or sync as separate conversations.
- **FR-017**: Reconciliation MUST accept `updatedAt` only as a valid RFC 3339 timestamp with an explicit UTC or numeric offset, reject impossible calendar dates, and compare represented instants rather than strings. Newly saved revisions MUST use canonical UTC timestamps with millisecond precision. Invalid remote timestamps MUST follow FR-008; invalid local timestamps MUST follow the corrupt-local preservation rule. Equal instants with different textual offsets MUST follow FR-002's content comparison, treating the represented instant as equal. Precision finer than milliseconds MUST be retained for ordering and MUST NOT be silently rounded into equality.
- **FR-018**: Successfully switching to a different bucket, region, or endpoint intentionally reconciles all eligible local history with the new destination, including uploading local-only conversations as new work. Settings help MUST explain this behavior. Old queued operations, deletes, deferred downloads, and conflict resolutions MUST remain bound to their original destination/configuration generation and MUST never execute against the new one. Credential changes MUST also invalidate old in-flight results and start fresh reconciliation, even if the storage location is unchanged. New reconciliation MUST establish new holds where needed; old holds MUST NOT authorize overwriting new-destination data. Removing configuration discards pending operations as required by FR-012, but MUST preserve local recovery copies. Late results from an obsolete configuration MUST NOT mutate local history, the active queue, or active sync status.

### Key Entities

- **Sync destination**: S3 bucket, region, optional endpoint, and protected credentials.
- **Conversation revision**: Locally or remotely saved conversation with an `updatedAt` value.
- **Pending mirror operation**: Durable write or deletion associated with its destination.
- **Sync result**: Downloaded, uploaded, skipped, or conflicting conversations and any recoverable error.
- **Held revision**: A conflicting or deferred candidate bound to its conversation and sync destination, with durable state and local recovery data kept outside normal history.

## Success Criteria

- **SC-001**: A remote-only valid conversation appears and opens after configured startup sync without restarting the app.
- **SC-002**: Each completed response eventually reaches S3 with matching history metadata when access is available.
- **SC-003**: Offline startup and upload failure never prevent local viewing or sending or duplicate a provider request.
- **SC-004**: Termination, retry, concurrent saves, and pending deletes do not regress revisions or resurrect a locally deleted conversation.
- **SC-005**: Incomplete configuration causes zero S3 requests, and destination changes never redirect old pending operations.
- **SC-006**: Conflicts and malformed remote objects survive retry and relaunch without automatic replacement; explicit resolution preserves displaced data and releases only the affected hold.
- **SC-007**: Downloads during active work never replace unsaved or newly committed local content, and idle unchanged conversations apply deferred newer revisions without another cold launch.

## Assumptions & Scope

- Complete configuration is necessary: keys alone cannot identify the bucket or region.
- Timestamp ordering follows the existing reconciliation model and assumes reasonably aligned device clocks. Equal-timestamp conflicts require user-visible reporting, not silent resolution.
- This specification extends archived spec 116 with inbound startup reconciliation and an explicit completed-response trigger. It is not continuous cross-device polling or a replacement for the local-first mirror.
- Existing engine behavior that automatically repairs malformed remote objects is superseded by FR-008. Conflict resolution and recovery copies are limited to preserving revisions encountered by this sync workflow; a general backup browser is outside scope.
