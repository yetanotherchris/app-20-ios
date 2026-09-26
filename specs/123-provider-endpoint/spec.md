# Feature Specification: Configurable Provider Endpoint

**Feature Branch**: `spec-121-124-settings-models-s3`
**Created**: 2026-09-26
**Status**: Draft
**Input**: User description: "Add an endpoint setting to Settings, defaulting to the OpenRouter endpoint."
**Depends on**: [112 Settings and Credentials](../archive/112-ios-settings-credentials/spec.md), [121 YAML Settings](../121-yaml-settings/spec.md)

## Purpose

Allow the user to configure an OpenAI-compatible API base URL in Settings, defaulting to OpenRouter. Model discovery and chat requests use the same saved destination.

## User Scenarios & Testing

### User Story 1 - Use the default endpoint (Priority: P1)

**Independent Test**: Launch a fresh install and an upgrade with no endpoint setting; inspect the displayed value and request destinations.

**Acceptance Scenarios**:

1. **Given** no saved endpoint, **When** Settings opens, **Then** it displays `https://openrouter.ai/api/v1` as the effective API base URL.
2. **Given** the default endpoint, **When** a prompt or catalog request runs, **Then** it targets `/api/v1/chat/completions` or `/api/v1/models` on OpenRouter respectively.

### User Story 2 - Change the provider destination (Priority: P1)

**Independent Test**: Save a custom base URL with a path prefix and trailing slash, relaunch, and exercise model discovery and streaming chat.

**Acceptance Scenarios**:

1. **Given** a valid custom base URL, **When** it saves, **Then** subsequent chat and model requests use that URL with the appropriate route appended and retain its path prefix.
2. **Given** an invalid draft URL, **When** the user edits it, **Then** a field error appears and the last valid saved destination remains active.
3. **Given** a custom endpoint, **When** the user resets it to default or imports `endpoint: ""`, **Then** subsequent requests use OpenRouter.
4. **Given** an import replacing the endpoint and API key together, **When** saving fails between writes or the app terminates before commit, **Then** subsequent requests and relaunch retain the previous endpoint/key pair until a complete replacement commits.

### Edge Cases

- Invalid URLs and failed saves preserve the active destination; trailing slashes are normalized; resetting and changing settings during a request have defined behavior.

**Priority rationale**: The default preserves existing behavior, while custom endpoints provide the requested provider choice.

## Requirements

### Functional Requirements

- **FR-001**: Settings MUST include a clearly labeled `API base URL` field, separate from the existing S3 endpoint field, with the default `https://openrouter.ai/api/v1` and a reset-to-default action.
- **FR-002**: The field MUST represent a base URL, not a complete chat route. Help text MUST include an example and explain that `/chat/completions` and `/models` are appended.
- **FR-003**: Validation MUST accept only absolute HTTPS URLs with a host and no embedded credentials, query, or fragment. Surrounding whitespace and trailing slashes MUST be normalized; a nonempty API path prefix MUST be preserved. Values ending in `/chat/completions` or `/models` MUST receive an actionable base-URL error.
- **FR-004**: Valid changes MUST use existing autosave, save-status, and retry behavior and persist across relaunch. Invalid drafts and failed saves MUST NOT replace the active saved endpoint.
- **FR-005**: No stored value or an empty value MUST resolve to the default base URL. Existing users MUST continue using OpenRouter without additional setup.
- **FR-006**: Both chat and catalog requests MUST resolve their routes from the saved base URL, without duplicating or dropping path segments. They MUST use the saved provider API key; the S3 endpoint MUST NOT affect provider requests.
- **FR-007**: Requests already in progress MUST retain the endpoint and credentials captured at start. Endpoint changes MUST invalidate or isolate old catalog results so late responses cannot populate the new endpoint's catalog.
- **FR-008**: YAML settings MUST support optional top-level string `endpoint`. Import MUST validate it together with all other supplied fields; omission preserves the current endpoint and `""` resets it. Nested `s3.endpoint` continues to configure S3 only.
- **FR-009**: The configured provider MUST support the existing OpenAI-compatible streaming Chat Completions contract. Unsupported protocols or provider errors MUST use the ordinary actionable error flow without automatic fallback to a different destination.
- **FR-010**: Changing the URL MUST NOT erase conversations or credentials. Settings help MUST make clear that the saved API key is used for the configured destination. Authentication credentials MUST NOT be forwarded to a different origin through redirects.
- **FR-011**: Endpoint, API key, and enabled-model changes supplied by one import MUST activate together under spec 121's commit and recovery guarantees. A manual endpoint change uses the saved API key as described in FR-010 and MUST activate the enabled list scoped to the new normalized endpoint at the same time; a failed save MUST retain the previous endpoint and its enabled list.

### Key Entities

- **Provider endpoint**: Normalized saved API base URL, independent of S3 configuration.
- **Effective endpoint**: Saved base URL or the OpenRouter default.

## Success Criteria

- **SC-001**: Fresh installs and upgrades without a custom URL send to the existing OpenRouter chat route.
- **SC-002**: Saved custom URLs survive relaunch and direct both model discovery and chat to the configured path prefix.
- **SC-003**: Invalid edits and failed saves leave the active destination unchanged.
- **SC-004**: Reset restores OpenRouter without deleting history or model choices saved for other endpoints.

## Assumptions & Scope

- One provider endpoint and one provider API key are active at a time. Managing separate credentials per endpoint is outside this feature.
- HTTPS endpoints supporting the existing streaming chat contract are in scope; local HTTP servers and non-OpenAI protocols are outside scope.
