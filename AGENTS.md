# Repository instructions

## Speckit workflow and completion

Read this file before running any speckit skill. These repository rules supplement the local skills and apply to combined plan/task/implement requests as well as individual stages. An implementation request authorizes the independent review agents described below; run them automatically without asking again.

- Planning and task generation: resolve the requested feature explicitly, read its spec, and generate the design artifacts and tasks. Before implementation, use an independent agent to review spec/plan/tasks consistency and testable coverage. Resolve actionable gaps before coding. Include implementation review, remediation, validation, and archive work in tasks.md.
- Implementation: execute the tasks and appropriate automated checks. Then run independent read-only agents for (1) code correctness/regressions and (2) requirements/acceptance coverage. Add a separate security/privacy review when the change handles credentials, persistence, authentication, or external data. Review agents should inspect the actual final diff and spec, report concrete file/line findings and severity, and identify verification limits. Do not substitute a planning research agent or the implementing agent's own review for these reviews.
- Remediation: assess every finding, fix applicable defects, add meaningful regression coverage, and rerun affected checks. Ask the relevant reviewer to verify fixes. Continue until no actionable findings remain; record accepted non-defects with rationale. If required reviews or checks cannot run, report the exact missing step and do not describe the workflow as complete or the PR as ready.
- Record reviews and validation in the feature's review.md (review roles, findings, resolution, final reviewed commit or diff, checks, and unverified acceptance). Keep tasks.md accurate; passing unit tests does not mean device acceptance passed.
- Archive after implementation and review remediation are complete: move the entire feature directory from specs/<feature>/ to specs/archive/<feature>/, set spec.md Status to Archived, and repair relative links within the moved artifacts and references from other live specs/docs. Preserve all design artifacts, checklists, tasks and review records. Update the selected local feature context if needed. Planning/task generation alone must not archive a feature. Do not archive unfinished implementation; document unavailable environment checks explicitly.
- PR readiness: complete the reviews, fixes, checks, review record and archive before creating the requested PR. When updating an existing PR, apply the same gates to its final changes. Only create/push a PR when authorized by the user; these workflow rules do not authorize merging, deployment, publication, or messages to others.
- Final report: link the PR when created, identify the archived spec, state which independent reviews ran and which checks passed, and disclose unverified acceptance. Distinguish implementation completion from acceptance that needs unavailable device tooling.

## Working tree and environment

Preserve unrelated user changes and stage only the authorized work. Use Linux PowerShell (`pwsh`) for .specify/scripts/powershell helpers in WSL; resolve feature paths from the selected context rather than assuming the branch name is sufficient.
