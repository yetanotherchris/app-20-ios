# Prompt to continue this session in WSL

Open this repository in WSL at `/mnt/c/Users/chris/Documents/GitHub/app-20-ios`, then paste the following prompt into Codex:

---

Continue the previous Windows Codex session in this repository. First read `git status`, confirm the current branch, and read `specs/README.md` and the four active specifications. Preserve existing changes.

Original request: add four new Spec Kit specs in one PR:

1. Change settings from JSON to YAML.
2. Add a searchable model list and enable/disable controls in Settings using an OpenAI-compatible `/models` endpoint; enabled models appear in the chat dropdown and actually determine the requested model.
3. Add a provider endpoint setting in Settings, defaulting to OpenRouter.
4. Implement S3 conversation synchronisation at app startup when S3 credentials and destination settings are complete, and upload each completed response.

The user also requested installation of Codex Spec Kit skills, and this WSL handoff prompt. The work so far is specifications and tooling only; do not start app implementation unless requested.

## Completed state

- Branch: `spec-121-124-settings-models-s3`.
- Commit `2826814` contains all four specs, their quality checklists, `specs/README.md`, and the official Spec Kit 1.0.4 Codex setup. It was pushed to origin.
- Single PR: https://github.com/yetanotherchris/app-20-ios/pull/1
- Specs: `specs/121-yaml-settings`, `specs/122-settings-model-catalog`, `specs/123-provider-endpoint`, and `specs/124-startup-response-s3-sync`.
- Ten official Codex skills are installed under `.agents/skills`. They are repository-scoped, not global user skills.
- Supporting templates, workflows, and PowerShell scripts are under `.specify`. Installation used the existing Windows Specify CLI with `specify init --here --integration codex --integration-options="--skills" --script ps --force --non-interactive`.
- The generated `.specify/memory/constitution.md` is an unratified placeholder template, not agreed project policy.
- This handoff file is staged on the same branch after the PR was created. Check Git status for the exact current state; it may not yet be committed or pushed.

## Decisions recorded in the drafts

- YAML replaces structured settings serialization and becomes the preferred import format. Legacy JSON/text imports remain accepted; raw credentials stay protected. Conversation files and manifests stay JSON.
- The provider endpoint is an HTTPS API base URL, default `https://openrouter.ai/api/v1`. Chat appends `/chat/completions`; discovery appends `/models`. This is independent of `s3.endpoint`.
- Model choices are scoped per endpoint. The OpenRouter default starts with `openrouter/auto`. Manual model identifiers support providers without discovery. Empty enabled lists block sending.
- S3 sync runs at cold startup and after a response completes, not for each streamed token. Existing local-first mirroring and durable retry are preserved. New startup reconciliation must coordinate conflicts, queued deletes, concurrent edits, and destination changes.
- Existing code already has `src/sync/engine.ts` reconciliation, `s3Remote.ts`, and a durable mirror queue, but the app lifecycle currently only runs the mirror queue at startup. The model dropdown and request model are currently hard-coded to OpenRouter Auto.

## Validation already performed

- All nine new Markdown files under the active specs and `specs/README.md` pass Prettier.
- Relative links in the four active spec directories were checked.
- `git diff --cached --check` passed before the specs commit.
- No runtime tests were run because no app source changed.

## WSL considerations and next actions

1. Confirm the branch, staged handoff file, and PR state before making changes. The requested four-spec PR already exists; do not create another PR.
2. The installed Spec Kit scripts are PowerShell scripts. Before invoking a skill from WSL, check whether `pwsh` is available or whether a Bash integration should be installed. Do not blindly force reinitialize and overwrite existing skills, templates, or specs.
3. The four features share a branch. Select the intended feature explicitly, for example `export SPECIFY_FEATURE_DIRECTORY=specs/121-yaml-settings`, before planning or clarification. Change it for each feature. `.specify/feature.json` is ignored machine-local state.
4. Recommended planning order is 121, 123, 122, then 124. Establish the constitution before planning depends on its governance rules. Await the user's next instruction if no new work is specified.

The user prefers autonomous execution with minimal confirmation, and explicitly requested staging all work on this branch. Do not spawn subagents unless the user or applicable instructions explicitly require delegation.
