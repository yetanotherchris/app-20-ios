# Tasks: Searchable Model Settings

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contract](contracts/model-settings.md).

## Phase 1: Setup

- [x] T001 Create branch and resolve specs 122 and 123 explicitly; inspect README.md, package.json and .specify/memory/constitution.md.
- [x] T002 Produce design artifacts under specs/122-settings-model-catalog/ and specs/123-provider-endpoint/.
- [x] T003 Obtain independent consistency and testable coverage review of specs/122-settings-model-catalog/tasks.md and related artifacts; resolve actionable gaps before code.

## Phase 2: Foundation

- [x] T004 Implement prerequisite endpoint contract and its tests under src/ai/providerEndpoint.ts and specs/123-provider-endpoint/tasks.md.
- [x] T005 Extend protected atomic snapshots and migrations with endpoint-scoped preferences in src/secrets/secretService.ts; verify failed commit retains previous pair/list in tests/secrets/secretService.test.ts.
- [x] T006 Extend TOML import/merge validation for endpoint and enabledModels in src/settings/settingsImport.ts and src/settings/settingsValidation.ts; test omitted/reset endpoint, duplicate/empty lists and incomplete S3 in tests/settings/.

## Phase 3: US1 Find and enable models (P1)

Independent test: full catalog, case-insensitive search, two toggles, retained query, close/relaunch and saved dropdown choices.

- [x] T007 [US1] Implement endpoint-keyed defaults, full catalog parsing and safe complete pagination in src/settings/modelCatalog.ts; test deduplication, full pages, cross-origin/path pagination rejection, loop detection and incomplete-total errors in tests/settings/modelCatalog.test.ts.
- [x] T008 [US1] Implement accessible searchable virtualized catalog and toggles in src/settings/ModelCatalogSection.tsx, integrated with retained SettingsSheet.tsx draft/autosave/retry; test committed dropdown updates in tests/settings/.
- [x] T009 [P] [US1] Add native toggle/search/relaunch acceptance in tests/e2e/models/catalog.yaml.

## Phase 4: US2 Send with chosen model (P1)

Independent test: exact IDs on successive sends, saved endpoint provenance and restore/invalidation/legacy rules without transcript changes.

- [x] T010 [US2] Implement selection/default/legacy validation in src/chat/modelSelection.ts and regression coverage in tests/chat/modelSelection.test.ts.
- [x] T011 [US2] Integrate enabled picker, invalidation, authoritative snapshot selection and captured settings requests in src/chat/IosChatScreen.tsx and src/chat/conversation.ts; add meaningful component regressions in tests/chat/.
- [x] T012 [US2] Ensure credential-free provenance survives JSON and S3 transfer in src/storage/schema.ts with tests/storage/schema.test.ts and tests/sync/ coverage.
- [x] T013 [P] [US2] Add native selected-send and endpoint/legacy acceptance flows under tests/e2e/models/.

## Phase 5: US3 Recover from catalog failure (P2)

Independent test: offline/unauthorized/malformed/empty/refresh, saved choices preserved, manual exact identifier and retry.

- [x] T014 [US3] Implement distinct discovery states, retry/refresh, unlisted retained identifiers and manual addition in src/settings/ModelCatalogSection.tsx; test stale endpoint results and failure retention in tests/settings/.
- [x] T015 [P] [US3] Add recovery acceptance under tests/e2e/models/ with fixture requirements documented in tests/e2e/models/README.md.

## Phase 6: Validation, archive and PR

- [ ] T016 Run lint/typecheck/unit/format checks from package.json and npm run test:e2e; record exact unavailable native tooling/scenarios in tasks.md.
- [ ] T017 Archive complete directories to specs/archive/122-settings-model-catalog/ and specs/archive/123-provider-endpoint/, set Archived status, repair references and selected local context.
- [ ] T018 Commit and publish authorized implementation PR; use root AGENTS.md description format and verify stored GitHub body.
- [ ] T019 Obtain five independent read-only PR reviews: correctness/regressions, requirements/acceptance, security/privacy, code quality and tests; post full attributed reports directly to GitHub PR.
- [ ] T020 Resolve every finding, add meaningful regression coverage, rerun affected checks, obtain relevant reviewer verification and reply with fix commits or rationale to every GitHub report.
- [ ] T021 Inspect actual GitHub checks and wait for completion; update tasks.md and report readiness with native acceptance limits. Do not merge without explicit authorization.

## Dependencies and parallel opportunities

Setup → foundation → US1 → US2 → US3 → validation/archive → PR → five reviews → remediation → checks. US2 helpers may be verified independently using exact fixtures; its UI needs committed US1 preferences. US3 builds on discovery. Native scenario files (T009/T013/T015) can be authored separately from source work once their contracts are fixed. No agent implementation delegation is assumed.

## Implementation strategy

Deliver US1 as the first independently testable increment, then selection/send and recovery. Complete the whole authorized feature before publication. Checklist requirements.md has 12 checked items and no unchecked items; leave reviewer-owned checklist markers unchanged. App acceptance is distinct from passing Vitest.

## Validation status

Native acceptance was attempted: `npm run test:e2e` exits 127 with `maestro: Permission denied`. No Maestro executable resolves in this environment, and `xcrun` is absent; no installed iOS build can be exercised. All catalog/picker, relaunch, SecureStore/file-picker, lifecycle and native redirect scenarios remain unverified. Maestro flows are authored for catalog, endpoint, selected send and recovery.

Lint and typecheck pass. Changed-file formatting passes. Repository-wide `npm run format:check` fails on pre-existing formatting; a clean HEAD archive also fails (185 files). The current failures are a subset of that baseline except the generated local `.specify/feature.json`, which will be formatted when updating archived context. Unit/component and HTTP S3 final validation is in progress.
