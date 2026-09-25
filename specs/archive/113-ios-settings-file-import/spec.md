# Feature Specification: iOS Settings File Import

**Feature Branch**: `spec-109-ios-chat-redesign`
**Created**: 2026-09-13
**Status**: Archived
**Depends on**: [112 iOS Settings and Credentials](../112-ios-settings-credentials/spec.md)

## User Scenarios & Testing

### User Story 1 - Import a valid settings file (Priority: P1)

The user selects one supported settings file and its provided values merge into Settings without replacing unspecified values.

**Independent Test**: Import valid JSON, raw-key text, and key-value text inputs. Confirm merge, persistence state, masking, and the imported filename status.

### User Story 2 - Recover from invalid import (Priority: P1)

The user receives an actionable error without partial replacement when a file is invalid or cancelled.

**Independent Test**: Import invalid encoding, an empty file, duplicate/unknown keys, invalid types, malformed values, oversized input, and cancel the picker.

## Requirements

### Functional Requirements

- **FR-001**: Settings MUST offer `Import from JSON file` as the full-width import row described in visual-spec.md section 10. It accepts one `.json` or `.txt` file and no media input.
- **FR-002**: The import MUST accept UTF-8 with optional BOM and reject inputs larger than 1 MiB, invalid encoding, empty files, duplicate names, unknown names, invalid types, and invalid configuration values.
- **FR-003**: JSON input MUST accept only optional string `apiKey` and optional `s3` object with string `bucket`, `region`, `accessKeyId`, `secretAccessKey`, and `endpoint` properties.
- **FR-004**: Text input MUST be either one raw API-key line or `KEY=value` lines using `API_KEY`, `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, and `S3_ENDPOINT`. Blank lines are ignored and parsing splits only at the first equals sign.
- **FR-005**: A successful import MUST merge only supplied values into the draft. An explicitly supplied empty string MUST clear that value. Valid values MUST follow Settings validation and automatic persistence.
- **FR-006**: An invalid import MUST leave the prior draft and saved configuration unchanged. Picker cancellation MUST leave draft and status unchanged.
- **FR-007**: Import status MUST show loading while reading, success only after persistence completes, and the ordinary save-error state if persistence fails. Status and errors MUST never contain secret values.
- **FR-008**: Importing replacement secret values MUST remask those values.

## Success Criteria

- **SC-001**: States 21-24 meet their design-state triggers and visible differences.
- **SC-002**: Every rejected input leaves both the displayed draft and persisted configuration unchanged.
- **SC-003**: Valid partial imports preserve unspecified existing values.

## Assumptions

- The design's visible label remains `Import from JSON file` even though the documented plain-text format is also supported.
