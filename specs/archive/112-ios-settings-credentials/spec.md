# Feature Specification: iOS Settings and Credentials

**Feature Branch**: `spec-109-ios-chat-redesign`
**Created**: 2026-09-13
**Status**: Archived
**Depends on**: [109 iOS Chat Redesign Baseline](../109-ios-chat-redesign-baseline/spec.md)

## User Scenarios & Testing

### User Story 1 - Configure local and optional S3 credentials (Priority: P1)

The user edits provider and optional S3 settings in a native Settings sheet that saves automatically.

**Independent Test**: Edit each field, pause, blur, close, create a partial S3 group, and force persistence failure. Confirm the saved value, retained draft, and status treatment.

### User Story 2 - Inspect a secret safely (Priority: P2)

The user temporarily reveals only the secret field they chose.

**Independent Test**: Reveal API and S3 secrets in turn, then close Settings, background the app, and import replacement values.

## Requirements

### Functional Requirements

- **FR-001**: Settings MUST be the native large sheet and grouped form specified in visual-spec.md section 10. It MUST have no Save action or discard confirmation.
- **FR-002**: The form MUST contain API key, S3 Bucket, Region, Access key ID, Secret access key, and optional Endpoint in the exact specified order and with exact section headings.
- **FR-003**: Settings MUST automatically save valid values after 600 milliseconds of idle editing, and immediately on blur, keyboard Done, or close. Pending writes MUST coalesce and serialize so an older write cannot win.
- **FR-004**: API settings MUST persist independently of S3 settings. A partial S3 group MUST remain in draft state and MUST NOT overwrite a complete saved S3 group.
- **FR-005**: All-empty S3 fields are valid. Any populated S3 field requires Bucket, Region, Access key ID, and Secret access key. A non-empty endpoint MUST be an absolute HTTPS URL.
- **FR-006**: Values MUST trim surrounding whitespace on persistence. Validation is syntactic only and MUST NOT include a connection-test control or claim credential validity.
- **FR-007**: API key and S3 secret fields MUST be masked by default. Revealing a field MUST reveal only that field and preserve value, selection, focus, and keyboard state. Revealed secrets MUST remask on Settings close, backgrounding, and imported replacement.
- **FR-008**: Secret values MUST remain protected at rest, never be written to logs, and never appear in status, success, or error text.
- **FR-009**: Settings MUST show Saving, Saved, and Not saved status exactly as defined in visual-spec.md. On failure it MUST retain the latest draft, preserve the last saved configuration, and provide retry.
- **FR-010**: Settings MUST use the specified S3 destination helper text. S3 remains optional, and a missing or partial S3 group MUST not prevent local chat saves or API-key persistence.
- **FR-011**: Field focus MUST keep the field and helper above the keyboard with the specified clearance. All targets, labels, scaling, and focus behavior MUST meet visual-spec.md sections 10 and 17.

## Success Criteria

- **SC-001**: States 16-20, 25, 28, and 34 meet their design-state triggers and visible differences.
- **SC-002**: A partial S3 edit never replaces complete saved S3 credentials.
- **SC-003**: A settings persistence failure never drops the current draft or exposes secret material.

## Assumptions

- The existing protected secret storage is extended to support the direct-edit source. Environment-supplied provider keys remain read-only and are not exposed in the form.
