# Feature Specification: YAML Settings

**Feature Branch**: `spec-121-124-settings-models-s3`
**Created**: 2026-09-26
**Status**: Draft
**Input**: User description: "Change from JSON for the settings to YAML"
**Depends on**: [112 Settings and Credentials](../archive/112-ios-settings-credentials/spec.md), [113 Settings File Import](../archive/113-ios-settings-file-import/spec.md)

## Purpose

Replace JSON with YAML for settings serialization and settings file import, preserving existing saved values and protected credential storage. Conversation files and their manifest retain their existing JSON format.

## User Scenarios & Testing

### User Story 1 - Import readable settings (Priority: P1)

The user imports a YAML settings file containing comments and only the values they want to change.

**Independent Test**: Import `.yaml` and `.yml` files with comments, quoted strings, API credentials, and partial S3 settings.

**Acceptance Scenarios**:

1. **Given** saved settings, **When** a valid partial YAML file is imported, **Then** supplied values are saved and unspecified values remain unchanged.
2. **Given** a configured secret, **When** its YAML value is `""`, **Then** that value is cleared; a replacement secret is masked.
3. **Given** an invalid file, **When** import is attempted, **Then** an actionable error appears and no draft or saved value changes.

### User Story 2 - Keep settings after upgrading (Priority: P1)

Existing users retain their settings without re-entering credentials.

**Independent Test**: Launch with existing JSON settings, verify every value, relaunch after migration, and inject a migration write failure.

**Acceptance Scenarios**:

1. **Given** existing saved JSON settings, **When** the upgraded app loads them, **Then** it preserves all values and migrates JSON-encoded settings records to YAML.
2. **Given** a failed migration write, **When** settings load, **Then** the previous values remain recoverable and retry does not lose them.

### Edge Cases

- Invalid YAML, duplicate keys, unsafe YAML constructs, oversized files, cancellation, and interrupted migration preserve existing values.

**Priority rationale**: Readable imports are the primary value; migration is equally critical to avoid requiring users to re-enter credentials.

## Requirements

### Functional Requirements

- **FR-001**: Settings MUST use YAML for newly serialized structured settings records. Raw secret values MUST remain in protected credential storage; this change MUST NOT create an unprotected plaintext settings file.
- **FR-002**: The settings import row MUST read `Import from YAML file` and accept one `.yaml` or `.yml` file. Existing `.json` and `.txt` imports MUST remain accepted as documented legacy formats.
- **FR-003**: YAML MUST contain exactly one mapping document. Initially supported fields are string `apiKey` and mapping `s3` with string `bucket`, `region`, `accessKeyId`, `secretAccessKey`, and `endpoint`. Specs 122 and 123 extend this schema with `enabledModels` and `endpoint` respectively.
- **FR-004**: Import MUST accept UTF-8 with optional BOM, comments, and quoted strings; it MUST reject empty input, invalid encoding, files over 1 MiB, duplicate or unknown keys at any supported level, invalid types or values, multiple documents, custom tags, anchors, aliases, and merge keys. Null, numeric, and boolean values MUST NOT be coerced to strings.
- **FR-005**: A valid import MUST merge only supplied fields. Explicit empty strings clear string values; absent fields preserve existing values. The entire prospective patch MUST validate before any mutation or persistence.
- **FR-006**: Invalid import or picker cancellation MUST preserve prior draft and saved settings. Save failure MUST retain recoverable prior settings and expose the existing retry behavior; success MUST be shown only after persistence finishes.
- **FR-007**: Existing JSON-encoded settings MUST migrate without losing values. Migration MUST be repeatable, preserve the previous representation until the replacement is safely saved, and never change raw API key contents.
- **FR-008**: Import errors and migration diagnostics MUST NOT include secret values. Imported secrets MUST be remasked and continue using existing protected storage.
- **FR-009**: User-facing examples MUST show YAML and document legacy imports. This feature MUST NOT add settings export or change conversation/manifest serialization.

### Key Entities

- **Settings document**: A YAML mapping of optional settings fields, distinct from conversation data.
- **Settings patch**: Validated supplied values merged into the existing settings snapshot.

## Success Criteria

- **SC-001**: Valid YAML imports preserve every unspecified value across relaunch.
- **SC-002**: Every invalid-input acceptance case leaves draft and saved settings unchanged.
- **SC-003**: Existing JSON settings migrate with equivalent values, including after interruption and retry.
- **SC-004**: No settings credential is copied into conversation files, manifests, logs, or unprotected settings files.

## Assumptions & Scope

- YAML replaces the structured settings representation, not the secure storage mechanism. Legacy import compatibility avoids breaking existing settings files.
- This specification supersedes the JSON-first label and serialization requirements of archived spec 113.
