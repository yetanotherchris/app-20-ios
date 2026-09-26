# Active feature specifications

These four draft specifications share the branch `spec-121-124-settings-models-s3` and one PR. They describe future behavior; the PR does not implement app changes.

| Spec                                                                                | Scope                                                                           |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| [121 YAML Settings](121-yaml-settings/spec.md)                                      | YAML settings serialization and import, with migration and legacy compatibility |
| [122 Searchable Model Settings](122-settings-model-catalog/spec.md)                 | Discover, search, enable, and select provider models                            |
| [123 Configurable Provider Endpoint](123-provider-endpoint/spec.md)                 | Persist an API base URL, defaulting to OpenRouter                               |
| [124 Startup and Response S3 Synchronisation](124-startup-response-s3-sync/spec.md) | Reconcile history at startup and upload completed responses                     |

Each directory includes a specification quality checklist. Existing behavior and design references remain under [archive](archive/).

## Codex Spec Kit skills

The official Spec Kit 1.0.4 Codex integration is installed in `.agents/skills`, with PowerShell scripts and templates in `.specify`. Invoke skills in Codex chat, for example `$speckit-clarify`, `$speckit-plan`, and `$speckit-tasks`.

Select one feature at a time for downstream commands. In the PowerShell environment used to launch Codex, set the feature directory explicitly:

```powershell
$env:SPECIFY_FEATURE_DIRECTORY = 'specs/121-yaml-settings'
```

Change that value to the desired directory from the table. The shared branch name does not identify an individual feature. `.specify/feature.json`, when created by a skill, is a machine-local alternative and is ignored by Git.

Recommended planning order: 121, 123, 122, then 124. S3 sync can be planned independently of the model and provider changes.

The generated constitution in `.specify/memory/constitution.md` is an unratified template. Establish project principles with `$speckit-constitution` before implementation planning relies on it.
