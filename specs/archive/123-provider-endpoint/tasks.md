# Tasks: Configurable Provider Endpoint

Shared branch with [122 tasks](../122-settings-model-catalog/tasks.md). Review and publication gates apply to both specs.

## Setup and foundation

- [x] T001 Inspect spec.md and create plan.md, research.md, data-model.md, contracts/provider-endpoint.md and quickstart.md.
- [x] T002 Obtain independent consistency review with specs/archive/122-settings-model-catalog/tasks.md before implementation.

## US1 Default endpoint (P1)

Independent test: fresh/upgrade default display and appended provider routes.

- [x] T003 [US1] Add normalized default/base route helpers in src/ai/providerEndpoint.ts and unit tests in tests/ai/providerEndpoint.test.ts.
- [x] T004 [US1] Persist backwards-compatible endpoint in src/secrets/secretService.ts and use saved destination for chat/catalog.

## US2 Change destination (P1)

Independent test: normalized custom prefix persists across relaunch, invalid/failed changes preserve active endpoint and reset restores default.

- [x] T005 [US2] Validate endpoint imports and atomic provider activation in src/settings/settingsImport.ts, src/settings/settingsValidation.ts and tests/settings/.
- [x] T006 [US2] Add API base URL, help/reset and autosave/retry in src/settings/SettingsSheet.tsx.
- [x] T007 [US2] Capture request URL/key and prohibit redirects in src/ai/openrouter.ts and src/settings/modelCatalog.ts; test capture, stale discovery and chat/catalog redirect mode to prevent credential forwarding.
- [x] T008 [US2] Add endpoint acceptance in tests/e2e/models/endpoint.yaml and joint provider import acceptance in tests/e2e/models/atomic-import.yaml.

## Completion

- [x] T009 Run package.json checks and native acceptance, disclose exact tooling limits in tasks.md.
- [x] T010 Archive specs/archive/123-provider-endpoint/ with repaired links after implementation.
- [ ] T011 Publish both features in authorized GitHub PR; complete five independent reviews, full comments, remediation/verification/dispositions and check gates tracked in specs/archive/122-settings-model-catalog/tasks.md.

Dependencies: setup → US1 → US2 → completion. Helper tests and native acceptance scenarios can be authored in parallel after contract review; source edits touching protected settings run sequentially. Incremental strategy preserves existing OpenRouter behavior first, then enables destination changes.

## Validation status

Native acceptance was attempted: `npm run test:e2e` exits 127 with `maestro: Permission denied`. No Maestro executable resolves in this environment, and `xcrun` is absent; no installed iOS build can be exercised. All catalog/picker, relaunch, SecureStore/file-picker, lifecycle and native redirect scenarios remain unverified. Maestro flows are authored for catalog, endpoint, selected send, recovery, live/restored same-ID provenance, seeded legacy selections and joint TOML imports; generated fixture preparation is documented. Native protected-write failure/termination injection remains unavailable.

Lint and typecheck pass. Changed-file formatting passes. Repository-wide `npm run format:check` fails on pre-existing formatting; a clean HEAD archive also fails (185 files). The current failures are a subset of that baseline except the generated local `.specify/feature.json`, which will be formatted when updating archived context. Final unit/component and HTTP S3 validation passes: 28 files, 269 tests. The S3 emulator exercises the tested HTTP contract and does not establish production backend compatibility.
