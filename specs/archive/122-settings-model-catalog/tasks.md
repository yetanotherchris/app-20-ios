# Tasks: Searchable Model Settings

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contract](contracts/model-settings.md).

## Phase 1: Setup

- [x] T001 Create branch and resolve specs 122 and 123 explicitly; inspect README.md, package.json and .specify/memory/constitution.md.
- [x] T002 Produce design artifacts under specs/archive/122-settings-model-catalog/ and specs/archive/123-provider-endpoint/.
- [x] T003 Obtain independent consistency and testable coverage review of specs/archive/122-settings-model-catalog/tasks.md and related artifacts; resolve actionable gaps before code.

## Phase 2: Foundation

- [x] T004 Implement prerequisite endpoint contract and its tests under src/ai/providerEndpoint.ts and specs/archive/123-provider-endpoint/tasks.md.
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

- [x] T016 Run lint/typecheck/unit/format checks from package.json and npm run test:e2e; record exact unavailable native tooling/scenarios in tasks.md.
- [x] T017 Archive complete directories to specs/archive/122-settings-model-catalog/ and specs/archive/123-provider-endpoint/, set Archived status, repair references and selected local context.
- [x] T018 Commit and publish authorized implementation PR; use root AGENTS.md description format and verify stored GitHub body.
- [x] T019 Obtain five independent read-only PR reviews: correctness/regressions, requirements/acceptance, security/privacy, code quality and tests; post full attributed reports directly to GitHub PR.
- [x] T020 Resolve every finding, add meaningful regression coverage, rerun affected checks, obtain relevant reviewer verification and reply with fix commits or rationale to every GitHub report.
- [x] T021 Inspect actual GitHub checks and wait for completion; update tasks.md and report completion and all remaining validation limits without claiming full readiness. Do not merge without explicit authorization.

- [x] T022 Preserve first-response model/provenance after selection invalidation in src/chat/IosChatScreen.tsx and assert completed autosave in tests/chat/IosChatScreen.sync.test.tsx.
- [x] T023 Retain endpoint-scoped unlisted editing rows in src/settings/ModelCatalogSection.tsx and test manual disable/re-enable in tests/settings/ModelCatalogSection.test.tsx.
- [x] T024 Add native provenance, legacy and joint import flows plus disposable fixture generator in tests/e2e/models/ and repair coverage descriptions.
- [x] T025 Gate retry/regenerate before library transcript mutation in src/chat/IosChatScreen.tsx and test preserved answers under stale selections; restrict provider errors from S3 helper text in src/settings/SettingsSheet.tsx.
- [x] T026 Obtain relevant independent reviewer verification of fixes and record each disposition directly in the GitHub PR discussion.

## Dependencies and parallel opportunities

Setup → foundation → US1 → US2 → US3 → validation/archive → PR → five reviews → remediation → checks. US2 helpers may be verified independently using exact fixtures; its UI needs committed US1 preferences. US3 builds on discovery. Native scenario files (T009/T013/T015) can be authored separately from source work once their contracts are fixed. No agent implementation delegation is assumed.

## Implementation strategy

Deliver US1 as the first independently testable increment, then selection/send and recovery. Complete the whole authorized feature before publication. Checklist requirements.md has 12 checked items and no unchecked items; leave reviewer-owned checklist markers unchanged. App acceptance is distinct from passing Vitest.

## Validation status

Native acceptance was attempted: `npm run test:e2e` exits 127 with `maestro: Permission denied`. No Maestro executable resolves in this environment, and `xcrun` is absent; no installed iOS build can be exercised. All catalog/picker, relaunch, SecureStore/file-picker, lifecycle and native redirect scenarios remain unverified. Maestro flows are authored for catalog, endpoint, selected send, recovery, live/restored same-ID provenance, seeded legacy selections and joint TOML imports; generated fixture preparation is documented. Native protected-write failure/termination injection remains unavailable.

Lint and typecheck pass. Changed-file formatting passes. Repository-wide `npm run format:check` fails on pre-existing formatting; a clean HEAD archive also fails (185 files). The current failures are a subset of that baseline except the generated local `.specify/feature.json`, which will be formatted when updating archived context. Final unit/component and HTTP S3 validation passes: 28 files, 269 tests. The S3 emulator exercises the tested HTTP contract and does not establish production backend compatibility.

All five independent implementation review roles completed their reviews and verified applicable fixes. Their full reports and finding dispositions are recorded directly in PR #4. `gh pr checks 4` reports no configured checks; this is distinct from passing CI. Final repository-wide formatting fails on 160 pre-existing files, all present in the clean-baseline failure set; PR-file formatting passes. Native acceptance remains unverified as disclosed above.
