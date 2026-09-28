# Model Settings Contract

## Discovery

GET `{normalizedBase}/models` with `Authorization: Bearer {savedKey}` when present. Never log keys or response bodies. Disable redirects. Required response: object with `data` array; each entry has nonempty string `id`, optional string `name`. Return all unique records after safe supported pagination completes. Failure retains enabled identifiers and complete cache. Do not assert chat capability from discovery.

## Settings UI

Search by display name or identifier without case sensitivity. Every row exposes the exact identifier and an accessible enable/disable control. Persist toggles through existing autosave and retry; update the chat dropdown only after commit. Distinguish loading, empty catalog, no matches and failure. Refresh/retry and manual exact-identifier addition are available; enabled missing models are labelled unlisted. Use a virtualized list for full catalogs.

## Imports and persistence

Optional top-level `endpoint` and `enabledModels` integrate with spec 121 validation. The endpoint omission preserves destination; empty endpoint means OpenRouter. Lists must contain unique nonempty strings, preserve exact identifiers and allow `[]`. Validate the entire supplied document before changing drafts or saved values. Commit eligible provider fields together with eligible S3 values in one protected snapshot. Failed commits keep the previous active provider and retained retry draft.

## Chat

Picker values are exact enabled identifiers. Placeholder explains selection or directs empty-list users to Settings. No valid selection disables send. Explicit selection writes model and endpoint provenance, preserving transcript. Restore with both endpoint match and enabled membership; use the specified legacy auto exception only. A request captures model, endpoint and credentials before submit; settings changes apply to future requests.
