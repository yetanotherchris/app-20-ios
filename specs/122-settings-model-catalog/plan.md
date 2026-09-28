# Implementation Plan: Searchable Model Settings

**Branch**: `spec-122-settings-model-catalog` | **Date**: 2026-09-28 | **Spec**: [spec.md](spec.md)

## Summary

Add endpoint-scoped model preferences, searchable discovery and manual entries to Settings, and use exact model identifiers with endpoint provenance in chat. Extend the existing protected TOML snapshot so provider settings imported together activate in one SecureStore write. The user authorized including prerequisite spec 123 on 2026-09-28. Its artifacts and implementation are included in this branch.

## Technical Context

**Language/Version**: TypeScript 6, React 19.2, React Native 0.86.

**Primary Dependencies**: Expo 57, expo-secure-store, smol-toml, app-20-llmchat, existing fetch streaming adapter. No new runtime dependency.

**Storage**: Protected settings TOML stores endpoint and endpoint-keyed enabled lists; conversation JSON stores optional selection provenance. Catalog metadata stays in endpoint-keyed memory and never includes credentials.

**Testing**: Vitest unit/component tests, existing S3 HTTP integration tests, Maestro iOS acceptance flows.

**Target Platform**: Expo iOS development build. WSL can run JavaScript checks; native acceptance depends on Maestro and an installed iOS build.

**Project Type**: Mobile application.

**Performance Goals**: Search locally without network calls; render the full catalog with a virtualized list.

**Constraints**: Preserve drafts and saved choices on failure; no automatic model substitution for existing conversations; capture provider settings and selection before sending; do not forward authentication through redirects or pagination links to another destination.

**Scale/Scope**: Three model-catalog stories; integrate the provider endpoint prerequisite separately if authorized.

## Constitution Check

The constitution is an unratified template. No placeholder is treated as a principle. Before and after design, apply the explicit feature requirements and repository safeguards: protected credentials, atomic activation, backwards-compatible conversation data, honest native acceptance limits. No principle exception is claimed.

## Project Structure

```text
src/ai/providerEndpoint.ts         # prerequisite endpoint normalization and route construction
src/settings/modelCatalog.ts      # discovery, pagination, search and defaults
src/settings/ModelCatalogSection.tsx     # searchable virtualized catalog and manual entry
src/secrets/secretService.ts      # protected endpoint-scoped settings transaction
src/settings/settingsImport.ts   # endpoint and enabledModels validation
src/settings/settingsValidation.ts
src/settings/SettingsSheet.tsx    # retained drafts, autosave and retry integration
src/chat/modelSelection.ts        # selection restoration and validity
src/chat/IosChatScreen.tsx        # picker, send capture and persistence
src/chat/conversation.ts          # optional provenance in snapshots
src/storage/schema.ts            # credential-free provenance serialization
 tests/settings/                  # catalog/import/save regressions
 tests/chat/                      # selection and chat regressions
 tests/e2e/models/                # native acceptance flows
```

**Structure Decision**: Extend the existing app modules and ports. Do not introduce a second settings store or provider SDK.

## Design

Read provider endpoint, key and preferences from one committed snapshot. Add optional fields for backwards compatibility with existing fixtures and records. Absence of an endpoint-specific preference initializes OpenRouter auto only at the default endpoint; an own saved empty list means disabled. Changing endpoint activates its saved preferences atomically. Merge imported enabledModels into the normalized imported endpoint, or current draft endpoint when omitted. Persist all eligible imported provider fields and complete S3 settings in the existing single-write transaction; retain incomplete S3 draft behavior.

Discovery consumes OpenAI-compatible data records, rejects malformed responses, deduplicates exact identifiers and uses name when supplied. Refresh keeps enabled identifiers even when absent. Support advertised next links and cursor pagination without forwarding credentials outside the saved route; refuse unsupported or looping pagination with an error rather than marking an incomplete result complete. Isolate late responses by endpoint/key and cancellation. Cache only successful complete catalogs by normalized endpoint. Empty, loading, no-match and failure states are separate; manual addition remains available during discovery failure.

Selection is a model identifier and normalized endpoint. Restore only when both match and identifier is enabled. A legacy auto identifier restores only on OpenRouter; every other legacy selection requires dropdown confirmation. New conversations choose only a sole enabled model. Invalidation clears live validity without modifying transcript messages or silently replacing saved selection. Explicit selection triggers autosave. Send captures one committed provider snapshot and valid selection before submitting, so subsequent settings changes do not mutate an in-flight request.

## Complexity Tracking

No exceptions. Native UI and filesystem acceptance cannot be inferred from jsdom tests.
