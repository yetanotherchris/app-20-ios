# Tasks: TOML Settings

Input: specs/121-toml-settings/ design artifacts. Tests implement the specification’s independent tests and failure-boundary scenarios.

## Phase 1: Setup

- [x] T001 Add TOML dependency in package.json and package-lock.json.

## Phase 2: Foundation

- [x] T002 Add bounded TOML 1.0 codec in src/settings/settingsToml.ts.

## Phase 3: US1 – Import readable settings (P1, MVP)

Goal: validated partial imports activate eligible groups atomically.
Independent test: comments/dotted keys/clears work; invalid imports preserve state; failed commit never activates a partial group.

- [x] T003 [P] [US1] Add parser and UTF-8 acceptance tests in tests/settings/settingsImport.test.ts.
- [x] T004 [P] [US1] Add atomic persistence failure/concurrency tests in tests/secrets/secretService.test.ts.
- [x] T005 [US1] Implement TOML/UTF-8 import validation in src/settings/settingsImport.ts and merged value validation in src/settings/settingsValidation.ts.
- [x] T006 [US1] Implement queued atomic protected snapshot commit in src/secrets/secretService.ts.
- [x] T007 [US1] Integrate picker, atomic import retry, incomplete status and masking in src/settings/SettingsSheet.tsx; verify in tests/settings/SettingsSheet.test.tsx.

## Phase 4: US2 – Keep settings after upgrading (P1)

Goal: recoverable repeatable JSON migration without credential re-entry.
Independent test: seed legacy records, fail replacement write, retry and relaunch with identical values.

- [x] T008 [US2] Add migration failure/relaunch tests in tests/secrets/secretService.test.ts.
- [x] T009 [US2] Implement non-destructive legacy migration in src/secrets/secretService.ts.

## Phase 5: Polish

- [x] T010 Update README.md, docs/examples/settings.toml and tests/e2e/ios/chat.yaml for TOML and legacy imports.
- [x] T011 Run automated checks and bundle validation; record results/limitations in specs/121-toml-settings/quickstart.md.

## Dependencies and parallel opportunities

T001 → T002 → US1 → US2 → polish. T003/T004 are independent test files and can be authored in parallel; implementation of the shared service is sequential. US2 tests may run independently of UI tests after foundation. Example: run parser tests and service tests concurrently for US1; run migration tests alongside manual legacy file validation for US2.

## Strategy

Deliver US1 MVP with atomic imports, then migration US2, then full regression and bundle checks. Both P1 stories ship together to preserve existing users. All tasks follow checkbox/ID/story/path format; 11 total (5 US1, 2 US2, 4 shared/polish).
