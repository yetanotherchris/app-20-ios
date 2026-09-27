# Active feature specifications

The active specifications below describe remaining work. [121 TOML Settings](archive/121-toml-settings/spec.md) and [124 Startup and Response S3 Synchronisation](archive/124-startup-response-s3-sync/spec.md) are implemented and archived. Feature 124's independent reviews and finding dispositions are posted directly on [PR #3](https://github.com/yetanotherchris/app-20-ios/pull/3). Feature 124 passed automated npm S3 validation; its iOS device acceptance remains unverified.

| Spec                                                                | Scope                                                |
| ------------------------------------------------------------------- | ---------------------------------------------------- |
| [122 Searchable Model Settings](122-settings-model-catalog/spec.md) | Discover, search, enable, and select provider models |
| [123 Configurable Provider Endpoint](123-provider-endpoint/spec.md) | Persist an API base URL, defaulting to OpenRouter    |

Each directory includes a specification quality checklist. Existing behavior and design references remain under [archive](archive/).

## Codex Spec Kit skills

The official Spec Kit 1.0.4 Codex integration is installed in `.agents/skills`, with PowerShell scripts and templates in `.specify`. Invoke skills in Codex chat, for example `$speckit-clarify`, `$speckit-plan`, and `$speckit-tasks`.

Select one feature at a time for downstream commands. In the PowerShell environment used to launch Codex, set the feature directory explicitly:

```powershell
$env:SPECIFY_FEATURE_DIRECTORY = 'specs/123-provider-endpoint'
```

Change that value to the desired directory from the table. The shared branch name does not identify an individual feature. `.specify/feature.json`, when created by a skill, is a machine-local alternative and is ignored by Git.

Recommended remaining planning order: 123, then 122.

The generated constitution in `.specify/memory/constitution.md` is an unratified template. Establish project principles with `$speckit-constitution` before implementation planning relies on it.

Repository workflow requirements are in [AGENTS.md](../AGENTS.md). Implementation includes independent reviews, remediation, validation and archiving before a requested PR is ready.
