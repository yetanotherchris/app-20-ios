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

### Edge Cases

- Incomplete settings, offline startup, conflicting revisions, pending deletions, corrupt objects, concurrent edits, and destination changes preserve recoverable local history.

**Priority rationale**: Startup recovery, response uploads, and failure recovery all protect conversation history.

## Requirements

### Functional Requirements

- **FR-001**: Once per cold launch, after loading settings and local storage, the app MUST initiate reconciliation when access key ID, secret access key, bucket, and region are complete and valid. The optional S3 endpoint MUST continue supporting the existing S3-compatible destination behavior.
- **FR-002**: Startup sync MUST download remote-only valid conversations and reconcile shared conversations using `updatedAt`: newer remote revisions download, newer local revisions upload, and identical revisions require no content write. Equal timestamps with different contents MUST retain the local copy and report a conflict without overwriting either copy automatically.
- **FR-003**: Startup MUST display local history without waiting for network access. Successful downloads MUST refresh history while preserving the user's current selection, unsaved draft, and any in-progress response. A newer downloaded revision for the active conversation MUST be applied only when it cannot overwrite active local work.
- **FR-004**: Every successfully completed assistant response, including edit-and-resend responses, MUST commit locally before a durable remote write is queued. Stream chunks MUST NOT independently trigger this completed-response action; cancelled or failed responses MUST NOT be marked as successfully completed.
- **FR-005**: The completed-response trigger MUST upload the latest conversation snapshot and corresponding manifest metadata. Existing local-first mirroring for draft saves, renames, and deletes MUST remain supported; this feature MUST NOT cause redundant writes for an unchanged revision.
- **FR-006**: Startup reconciliation and mirror operations MUST coordinate so stale queued writes or downloads cannot overwrite newer local or remote revisions. Pending deletes MUST be accounted for before remote downloads; after reconciliation, pending uploads MUST refer to the latest reconciled local revision.
- **FR-007**: The existing `conversations/` destination prefix, JSON conversation format, and `manifest.json` contract MUST remain compatible. Sync MUST enumerate every page of the remote listing and discover valid conversation objects even when the remote manifest is absent or stale.
- **FR-008**: Invalid, empty, or unsafe remote filenames and malformed conversation objects MUST be skipped with nonsecret diagnostics. A corrupt local file MUST remain recoverable and MUST NOT be overwritten automatically. Remote permission, timeout, and network errors MUST NOT be interpreted as object absence.
- **FR-009**: Remote absence MUST NOT delete a local conversation. Explicit local deletes MUST continue propagating through the existing durable queue. Detecting deletes performed by other clients through tombstones is outside scope.
- **FR-010**: S3 failure MUST preserve locally committed data and show an actionable nonblocking warning. Startup-download errors MUST describe inability to sync history; upload errors MUST retain the existing `Saved on this device. Couldn’t save to S3.` feedback. Retry MUST perform sync work without resending prompts.
- **FR-011**: Pending writes and deletes MUST survive termination and resume with valid configuration. Multiple triggers MUST NOT create overlapping reconciliation runs or reorder writes to the same conversation. Retries MUST converge without duplicate conversation entries.
- **FR-012**: Removing S3 configuration MUST stop future remote work and discard pending operations as required by spec 116, preserving local and remote data. Changing the bucket, region, endpoint, or credentials MUST isolate old work so it cannot be sent to the new destination; a newly complete configuration MUST initiate reconciliation against that destination.
- **FR-013**: Sync MUST transfer only conversation data and its manifest. Provider keys, S3 credentials, and settings documents MUST NOT be uploaded or exposed in errors or logs.
- **FR-014**: Sync MAY run only while the app has execution time. Relaunch and existing foreground retry behavior MUST resume interrupted work; suspended-app execution and background scheduling are not required.

### Key Entities

- **Sync destination**: S3 bucket, region, optional endpoint, and protected credentials.
- **Conversation revision**: Locally or remotely saved conversation with an `updatedAt` value.
- **Pending mirror operation**: Durable write or deletion associated with its destination.
- **Sync result**: Downloaded, uploaded, skipped, or conflicting conversations and any recoverable error.

## Success Criteria

- **SC-001**: A remote-only valid conversation appears and opens after configured startup sync without restarting the app.
- **SC-002**: Each completed response eventually reaches S3 with matching history metadata when access is available.
- **SC-003**: Offline startup and upload failure never prevent local viewing or sending or duplicate a provider request.
- **SC-004**: Termination, retry, concurrent saves, and pending deletes do not regress revisions or resurrect a locally deleted conversation.
- **SC-005**: Incomplete configuration causes zero S3 requests, and destination changes never redirect old pending operations.

## Assumptions & Scope

- Complete configuration is necessary: keys alone cannot identify the bucket or region.
- Timestamp ordering follows the existing reconciliation model and assumes reasonably aligned device clocks. Equal-timestamp conflicts require user-visible reporting, not silent resolution.
- This specification extends archived spec 116 with inbound startup reconciliation and an explicit completed-response trigger. It is not continuous cross-device polling or a replacement for the local-first mirror.
