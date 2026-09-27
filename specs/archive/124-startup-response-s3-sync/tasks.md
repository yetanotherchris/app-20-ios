# Tasks: Startup and Response S3 Synchronisation

## Setup and foundations

- [x] T001 Complete independent spec/plan/tasks consistency review and resolve gaps in the PR #3 discussion.
- [x] T002 Install npm s3rver test server and SHA-256 dependency in package.json and package-lock.json; verify ignore rules in .prettierignore.
- [x] T003 Implement strict precision-preserving timestamps and semantic comparisons in src/sync/revision.ts; tighten src/storage/constants.ts safe filenames and preserve optional provenance in src/storage/schema.ts.
- [x] T004 Implement atomic destination-bound queue/holds/deferrals/recovery persistence in src/sync/reconciliationFile.ts and coordinator interfaces in src/sync/reconciliation.ts.

## US1 — recover startup history (P1)

Independent test: local history renders before network, remote-only history opens after import; incomplete settings issue zero requests.

- [x] T005 [US1] Add startup, safe timestamp reconciliation and manifest/listing tests in tests/sync/reconciliation.test.ts.
- [x] T006 [US1] Implement all-name reconciliation, safe reads, no redundant writes and history callbacks in src/sync/reconciliation.ts and src/sync/engine.ts.
- [x] T007 [US1] Connect native service and startup after local readiness in src/sync/syncService.ts and src/chat/IosChatScreen.tsx.

## US2 — save responses remotely (P1)

Independent test: completed/edit-resend revisions and metadata arrive remotely; chunks never invoke completion; retry never sends prompts.

- [x] T008 [US2] Add response and durable latest-write regression tests in tests/sync/reconciliation.test.ts and tests/chat/.
- [x] T009 [US2] Coordinate local saves and explicitly queue successful response commits in src/chat/IosChatScreen.tsx; use canonical fresh timestamps while deduplicating unchanged revisions.
- [x] T010 [US2] Validate real object and manifest transfer with npm server in tests/sync/s3.integration.test.ts.

## US3 — failures and conflicts (P1)

Independent test: offline recovery, relaunch, deletes, held manifests, explicit resolution, concurrent saves, malformed objects, timestamps and configuration switches preserve both revisions.

- [x] T011 [US3] Add deterministic races/relaunch/resolution/configuration, legacy delete migration and invalid-UTF8 recovery tests in tests/sync/reconciliation.test.ts and pagination tests in tests/sync/s3Remote.test.ts.
- [x] T012 [US3] Implement durable holds, recovery-before-replacement, remote rechecks, deferral convergence and delete precedence in src/sync/reconciliation.ts.
- [x] T013 [US3] Fence all obsolete configuration results and isolate/discard old operations while preserving recovery in src/sync/reconciliation.ts and src/sync/syncService.ts.
- [x] T014 [US3] Add nonblocking history/upload retry and conflict/repair actions, active-work protection and idle revision refresh in src/chat/IosChatScreen.tsx.
- [x] T015 [US3] Explain new-destination transfer in src/settings/SettingsSheet.tsx and test help in tests/settings/SettingsSheet.test.tsx.

## Review, validation and archive

- [x] T016 Run automated tests/typecheck/lint and record results and device acceptance limits in the PR #3 discussion.
- [x] T017 Run independent read-only code correctness/regression review of final scoped diff and record findings in the PR #3 discussion.
- [x] T018 Run independent read-only requirements/acceptance review of actual implementation against spec in the PR #3 discussion.
- [x] T019 Run independent read-only security/privacy review of persistence/credentials/external data in the PR #3 discussion.
- [x] T020 Remediate all applicable findings, add regressions, rerun affected checks and obtain reviewer verification in the PR #3 discussion.
- [x] T021 Archive completed feature to specs/archive/124-startup-response-s3-sync/, mark spec Archived and repair artifact/dependency links and selected .specify/feature.json context.

## Dependencies and execution

T001 gates coding. T002–T004 precede US1, US1 precedes US2, US3 completes shared protection before release. T016–T020 gate T021. All stories are P1; startup import is the first increment, not the full deliverable. Independent test files can be developed in parallel after shared contracts, but shared coordinator/screen edits are sequential. Review roles run independently against the same final scoped baseline diff. All 21 tasks use checklist IDs and explicit file paths (US1: 3, US2: 3, US3: 5, shared/final: 10).

## Published PR remediation

- [x] T022 Run fresh independent correctness, requirements and security reviews against published PR head and archived spec; record findings in the PR #3 discussion.
- [x] T023 Fix completed-history saves, active-work replacement races, partial-import metadata, deletion retry and concurrent S3 writes; add regression tests in tests/chat and tests/sync.
- [x] T024 Obtain independent verification of final fixes and complete automated checks; record reviewed diff and limitations in the PR #3 discussion.
- [x] T025 Commit and push reviewed remediation to the existing authorized PR #3 and update its validation description.

## Continuation of PR review gate

- [x] T026 Add native Maestro sync scenario flows and explicit fixture/backend verification instructions in tests/e2e/sync; record unavailable device acceptance.
- [x] T027 Complete all five independent final-diff reviews, remediate findings and obtain verification; post complete reports and dispositions directly on PR #3.
- [x] T028 Publish review reports and disposition replies to PR #3, update its description and inspect GitHub checks.

## PR comment review workflow correction

- [x] T029 Remove repository review files introduced by this PR and repair guidance, skill instructions and feature references so complete reports live in PR comments.
- [x] T030 Complete one independent artifact-compliance review of this documentation-only correction, resolve findings and post its report and disposition on PR #3.
- [x] T031 Update existing PR comments and description to remove deleted-file links, preserve prior review/validation details in the discussion, and verify stored content and GitHub checks.
