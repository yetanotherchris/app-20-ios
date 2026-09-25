# Feature Specification: Durable Local-First S3 Mirror

**Feature Branch**: `spec-109-ios-chat-redesign`
**Created**: 2026-09-13
**Status**: Archived
**Depends on**: [112 iOS Settings and Credentials](../112-ios-settings-credentials/spec.md)

## User Scenarios & Testing

### User Story 1 - Continue after an S3 mirror failure (Priority: P1)

The user keeps a successfully saved local conversation when configured S3 mirroring is unavailable and can retry the remote write without resending a prompt.

**Independent Test**: Configure S3, cause a remote write failure after a local save, then retry and verify the prompt is not sent again and local history remains available.

### User Story 2 - Resume remote mirroring after an interruption (Priority: P1)

The user can leave the application while remote mirroring is pending and the application resumes that work after it next becomes active with S3 configured.

**Independent Test**: Configure S3, make a local conversation change while remote access is unavailable, terminate the application, relaunch it with remote access available, and verify that the latest local revision reaches S3 without another provider request.

## Requirements

### Functional Requirements

- **FR-001**: Without a complete S3 group, every conversation save MUST remain local and MUST not show an S3 warning.
- **FR-002**: With complete S3 configuration, a conversation mutation MUST commit locally before its remote mirror attempt. Remote latency or failure MUST not block viewing, sending, renaming, or deleting locally.
- **FR-003**: A remote mirror failure MUST show the designed nonblocking chat banner: `Saved on this device. Couldn’t save to S3.` with the accessible 44-point retry action.
- **FR-004**: Retrying MUST mirror pending conversation revisions and mutations without resending a model prompt or changing completed local state.
- **FR-005**: Remote writes MUST serialize by conversation revision so an earlier revision cannot overwrite a later revision.
- **FR-006**: Local rename and delete MUST complete first and retain their local result if their remote mirror fails. The same destination-error pattern applies.
- **FR-007**: Removing every S3 field MUST make future saves local only and MUST NOT imply remote deletion.
- **FR-008**: The feature MUST not add sync settings, sync-progress screens, connectivity tests, or credential upload to S3.
- **FR-009**: After a successful local mutation with complete S3 configuration, the pending remote operation MUST be recorded before its remote attempt begins.
- **FR-010**: Pending remote operations MUST survive application termination and resume when the application next becomes active with complete S3 configuration.
- **FR-011**: Remote operations MAY run only while the application has execution time. The application MUST NOT claim that it can complete a remote operation while suspended.
- **FR-012**: A resumed remote operation MUST mirror the latest local revision for each conversation and MUST NOT resend a provider prompt, mutate local content, or duplicate a completed remote operation.
- **FR-013**: Removing complete S3 configuration MUST discard all pending remote operations. It MUST NOT change local conversations, delete remote data, or attempt remote work using the removed configuration.

## Success Criteria

- **SC-001**: State 35 meets its documented trigger and visible differences.
- **SC-002**: A remote failure never removes a successful local change or causes a duplicate provider request.
- **SC-003**: Retrying a failed mirror eventually updates the remote destination using the latest local revision.
- **SC-004**: A remote change pending at termination reaches S3 after relaunch and activation when S3 remains configured and becomes available.
- **SC-005**: Removing S3 configuration discards pending remote work while preserving every local conversation.

## Assumptions

- Remote attempts run through a durable in-application queue. Operating-system background scheduling is not required for beta behavior.
