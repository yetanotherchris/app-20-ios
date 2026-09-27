# Feature Specification: TOML Settings

**Feature Branch**: `121-toml-settings`
**Created**: 2026-09-26
**Status**: Archived
**Input**: User decision: "Use TOML instead of YAML for settings."
**Depends on**: [112 Settings and Credentials](../112-ios-settings-credentials/spec.md), [113 Settings File Import](../113-ios-settings-file-import/spec.md)

## Purpose

Replace JSON with TOML for settings serialization and settings file import, preserving existing saved values and protected credential storage. Conversation files and their manifest retain their existing JSON format.

## User Scenarios & Testing

### User Story 1 - Import readable settings (Priority: P1)

The user imports a TOML settings file containing comments and only the values they want to change.

**Independent Test**: Import `.toml` files with comments, quoted strings, API credentials, and partial S3 settings.

**Acceptance Scenarios**:

1. **Given** saved settings, **When** a valid partial TOML file leaves each affected group complete or all-empty, **Then** supplied values are saved and unspecified values remain unchanged.
2. **Given** a configured secret, **When** its TOML value is `""`, **Then** that value is cleared; a replacement secret is masked.
3. **Given** an invalid file, **When** import is attempted, **Then** an actionable error appears and no draft or saved value changes.
4. **Given** no S3 configuration, **When** a syntactically valid file supplies only `s3.bucket` and a valid API key, **Then** the bucket remains an incomplete draft, the API key saves independently, no S3 requests start, and import status explains that S3 settings still need completion.
5. **Given** complete saved S3 settings, **When** an import supplies `s3.secretAccessKey = ""`, **Then** the secret is cleared in the draft but the saved S3 group remains active until the draft is complete or all S3 fields are cleared.
6. **Given** an import replacing the provider endpoint, API key, and enabled models, **When** a persistence write fails or the app terminates before commit, **Then** requests and relaunch use the complete previous provider configuration, retry can commit the complete replacement, and no request uses a mixture of old and new values.

### User Story 2 - Keep settings after upgrading (Priority: P1)

Existing users retain their settings without re-entering credentials.

**Independent Test**: Launch with existing JSON settings, verify every value, relaunch after migration, and inject a migration write failure.

**Acceptance Scenarios**:

1. **Given** existing saved JSON settings, **When** the upgraded app loads them, **Then** it preserves all values and migrates JSON-encoded settings records to TOML.
2. **Given** a failed migration write, **When** settings load, **Then** the previous values remain recoverable and retry does not lose them.

### Edge Cases

- Invalid TOML, duplicate keys, invalid TOML types or table definitions, oversized files, cancellation, and interrupted migration preserve existing values.

**Priority rationale**: Readable imports are the primary value; migration is equally critical to avoid requiring users to re-enter credentials.

## Requirements

### Functional Requirements

- **FR-001**: Settings MUST use TOML for newly serialized structured settings records. Raw secret values MUST remain in protected credential storage; this change MUST NOT create an unprotected plaintext settings file.
- **FR-002**: The settings import row MUST read `Import from TOML file` and accept one `.toml` file. Existing `.json` and `.txt` imports MUST remain accepted as documented legacy formats.
- **FR-003**: Settings MUST use TOML 1.0 syntax. Initially supported fields are top-level string `apiKey` and table `s3` with string `bucket`, `region`, `accessKeyId`, `secretAccessKey`, and `endpoint`. Specs 122 and 123 extend this schema with `enabledModels` and `endpoint` respectively.
- **FR-004**: Import MUST accept UTF-8 with an optional leading BOM removed before parsing, comments, quoted strings, tables, and dotted keys that resolve to the supported schema. It MUST reject empty or comment-only input, invalid encoding, files over 1 MiB, invalid TOML syntax, duplicate key definitions, invalid table redefinitions, unknown keys at any supported level, and invalid types or values. Numbers, booleans, dates, arrays, and tables MUST NOT be coerced to strings. Arrays are allowed only where the schema explicitly permits them, such as `enabledModels` in spec 122. TOML has no null value; an empty string clears a string field and an omitted key preserves it.
- **FR-005**: A valid import MUST merge only supplied fields into the current draft. Explicit empty strings clear string values; absent fields preserve existing values. All supplied fields and the merged draft MUST pass syntax, type, and value validation before any mutation or persistence. S3 completeness is a separate save eligibility check: a syntactically valid incomplete S3 group MUST be accepted into the draft and MUST NOT replace the saved S3 group. A complete or all-empty S3 group is eligible to save. Ordinary manual editing retains the independent provider/S3 autosave behavior of archived spec 112.
- **FR-006**: Invalid import or picker cancellation MUST preserve prior draft and saved settings. Save failure MUST retain the imported draft for retry and the complete previous active configuration; success MUST be shown only after persistence finishes and no imported group remains incomplete. An incomplete S3 import MUST show a completion-needed status, even if independently eligible provider fields have saved. Clearing one required S3 field MUST NOT disable the saved destination; clearing all S3 fields and successfully saving MUST disable it.
- **FR-007**: Existing JSON-encoded settings MUST migrate without losing values. Migration MUST be repeatable, preserve the previous representation until the replacement is safely saved, and never change raw API key contents.
- **FR-008**: Import errors and migration diagnostics MUST NOT include secret values. Imported secrets MUST be remasked and continue using existing protected storage.
- **FR-009**: User-facing examples MUST show TOML and document legacy imports. This feature MUST NOT add settings export or change conversation/manifest JSON encoding. Backward-compatible optional conversation fields required by spec 122 are permitted.
- **FR-010**: Each import MUST commit all eligible groups as one observable settings change. An incomplete S3 draft is excluded from that commit. Until the commit succeeds, requests MUST use the previous saved configuration, including its provider endpoint, API key, and endpoint-scoped enabled models. Failure or termination between persistence writes MUST recover the previous complete configuration before requests or S3 work resume; a successfully committed import MUST recover the complete replacement. Retry MUST NOT activate a mixture of values from different commits. Secret recovery data MUST remain protected at rest.

### Key Entities

- **Settings document**: A TOML document of optional settings keys and tables, distinct from conversation data.
- **Settings patch**: Validated supplied values merged into the existing settings snapshot.

## Success Criteria

- **SC-001**: Valid TOML imports preserve every unspecified value across relaunch.
- **SC-002**: Every invalid-input acceptance case leaves draft and saved settings unchanged.
- **SC-003**: Existing JSON settings migrate with equivalent values, including after interruption and retry.
- **SC-004**: No settings credential is copied into conversation files, manifests, logs, or unprotected settings files.
- **SC-005**: Failure or termination at any import write boundary never activates a mixed provider configuration; incomplete S3 drafts never replace the saved S3 group.

## Assumptions & Scope

- TOML replaces the structured settings representation, not the secure storage mechanism. Legacy import compatibility avoids breaking existing settings files.
- This specification supersedes the JSON-first label and serialization requirements of archived spec 113.
- Import commit guarantees in FR-010 supersede independent persistence for eligible groups within a single import; ordinary manual provider and S3 edits remain independent.

## Settings File Example

Top-level provider keys MUST appear before `[s3]` in this layout; keys after that header belong to the S3 table. Credential values below are placeholders. Imported credentials continue to use protected storage, and this feature adds no plaintext settings export.

```toml
# Provider settings (specs 122 and 123 extend the base schema)
apiKey = "YOUR_PROVIDER_API_KEY"
endpoint = "https://openrouter.ai/api/v1"
enabledModels = ["openrouter/auto"]

[s3]
bucket = "my-conversations"
region = "eu-west-2"
accessKeyId = "YOUR_S3_ACCESS_KEY_ID"
secretAccessKey = "YOUR_S3_SECRET_ACCESS_KEY"
# Optional S3-compatible endpoint; distinct from the provider endpoint
endpoint = ""
```

Partial imports may omit keys or the entire S3 table. `enabledModels = []` disables every model for the document's effective provider endpoint. All-empty S3 values disable sync only after a successful save; clearing one required S3 value leaves an incomplete draft as defined in FR-006.
