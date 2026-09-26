# Feature Specification: Searchable Model Settings

**Feature Branch**: `spec-121-124-settings-models-s3`
**Created**: 2026-09-26
**Status**: Draft
**Input**: User description: "Add and toggle models in Settings using a searchable full list from an OpenAI-compatible /models endpoint, then show enabled models in the conversation dropdown."
**Depends on**: [121 YAML Settings](../121-yaml-settings/spec.md), [123 Configurable Provider Endpoint](../123-provider-endpoint/spec.md)

## Purpose

Let users search the configured provider's model catalog and enable models in Settings. Enabled models appear in the conversation dropdown and determine the model used for requests.

## User Scenarios & Testing

### User Story 1 - Find and enable models (Priority: P1)

**Independent Test**: Load a catalog, search by name and identifier, enable two models, disable one, close Settings, and relaunch.

**Acceptance Scenarios**:

1. **Given** a configured endpoint, **When** the model section opens, **Then** its full catalog is loaded with search and an enabled-state toggle for each model.
2. **Given** a search query, **When** it matches a model name or identifier regardless of case, **Then** matching rows remain visible and changing a toggle does not reset the search.
3. **Given** saved model choices, **When** Settings closes or the app relaunches, **Then** the conversation dropdown contains those enabled choices.

### User Story 2 - Send with the chosen model (Priority: P1)

**Independent Test**: Select two different models in successive sends and inspect the outgoing model identifiers and saved conversation selection.

**Acceptance Scenarios**:

1. **Given** an enabled model selected in chat, **When** a prompt is sent, **Then** the request uses its exact identifier and the conversation saves that selection.
2. **Given** an existing conversation, **When** it reopens, **Then** its model selection is restored if still enabled for the current endpoint.
3. **Given** the selected model was disabled or belongs to another endpoint, **When** the conversation opens, **Then** history remains readable and a valid selection is required before sending, without silently changing the model.

### User Story 3 - Recover from catalog failure (Priority: P2)

**Independent Test**: Exercise offline, unauthorized, malformed, empty, and refreshed catalog responses.

**Acceptance Scenarios**:

1. **Given** a failed catalog request, **When** Settings shows the error, **Then** retry is available and previously saved models remain usable.
2. **Given** a provider without model discovery, **When** discovery fails, **Then** the user can add an exact model identifier manually and enable it.

### Edge Cases

- Offline or malformed catalogs retain saved choices; unlisted models allow manual entry; no enabled models blocks sending; endpoint changes isolate choices.

**Priority rationale**: Finding models and sending with the chosen model are the core flows; catalog recovery supports continued use when discovery is unavailable.

## Requirements

### Functional Requirements

- **FR-001**: Settings MUST offer a searchable model catalog fetched using the OpenAI-compatible `GET /models` route under the saved API base URL. Requests MUST use the current endpoint's API key when present.
- **FR-002**: The catalog MUST accept the OpenAI-compatible `data` array with string `id`, use optional display names when available, deduplicate identifiers, and show the full returned list rather than a hard-coded subset. Any provider-supported pagination MUST be exhausted before claiming the catalog is complete.
- **FR-003**: Search MUST match display name and identifier case-insensitively. Rows MUST expose their identifier and an accessible enable/disable control. Loading, empty catalog, no search results, and error states MUST be distinct.
- **FR-004**: Enabling or disabling a model MUST follow existing settings autosave and retry behavior, persist across relaunch, and update the chat dropdown after successful saving. Duplicate choices MUST NOT appear.
- **FR-005**: Saved model identifiers and cached catalog data MUST be scoped to the normalized provider base URL. Switching endpoints MUST restore that endpoint's choices without carrying another endpoint's models into its dropdown.
- **FR-006**: The chat dropdown MUST contain only enabled models for the current endpoint. Selecting a model MUST set the actual request `model` value and persist the conversation selection; a display label MUST NOT substitute for the identifier.
- **FR-007**: With no enabled model, the dropdown MUST explain how to add models in Settings and sending MUST be unavailable. Disabling the selected model MUST require a new selection before the next send; existing transcript messages MUST remain unchanged.
- **FR-008**: Existing users on the default OpenRouter endpoint MUST start with `openrouter/auto` enabled and selected. This fallback MUST NOT be automatically enabled for other endpoints or restored after the user explicitly disables it.
- **FR-009**: Catalog failures MUST offer retry without clearing saved choices. Refresh MUST NOT automatically enable newly discovered models or remove saved identifiers that disappear from the catalog; absent identifiers MUST be marked as unlisted.
- **FR-010**: Users MUST be able to add a nonempty exact model identifier manually, including when `/models` is unsupported. An unlisted identifier MAY be used, with provider rejection handled by the ordinary send-error flow; discovery MUST NOT claim every returned model supports chat.
- **FR-011**: A request in progress MUST retain its captured model and endpoint even if settings change. New choices apply to subsequent requests.
- **FR-012**: YAML settings MUST support `enabledModels` as a list of unique nonempty string identifiers for the document's endpoint, or the current endpoint when omitted. A supplied list replaces that endpoint's enabled list; `[]` explicitly disables all models. Import validation MUST be atomic with the other supplied settings.

### Key Entities

- **Catalog model**: Provider identifier and optional display metadata.
- **Enabled model selection**: Endpoint-scoped saved list of identifiers.
- **Conversation model**: Identifier selected for subsequent prompts in that conversation.

## Success Criteria

- **SC-001**: Every valid returned catalog model can be found by its identifier and toggled.
- **SC-002**: Enabled choices survive closing Settings and relaunching and match the dropdown contents.
- **SC-003**: Each send uses the exact selected identifier; no path remains hard-coded to `openrouter/auto`.
- **SC-004**: Catalog failure preserves saved choices and permits manual entry and retry.

## Assumptions & References

- Discovery follows the saved provider endpoint, rather than always querying OpenAI directly.
- API references: [OpenRouter model catalog](https://openrouter.ai/docs/api/api-reference/models/get-models) and [OpenAI models API](https://platform.openai.com/docs/api-reference/models).
