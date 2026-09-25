# Data Model: iOS Chat Redesign Remediation

These are runtime and in-memory entities. No on-disk format changes are introduced.

## Conversation UI State

Held per conversation id in `IosChatScreen` (`conversationUiStateRef`).

| Field          | Type             | Notes                                               |
| -------------- | ---------------- | --------------------------------------------------- |
| `draft`        | `string`         | The ordinary composer text.                         |
| `editSourceId` | `string \| null` | The user message currently being edited and resent. |
| `parkedDraft`  | `string \| null` | The ordinary draft set aside while editing.         |

**Transitions**

- `startEdit(message)`: if `editSourceId` is null, park the current draft; set `editSourceId` and copy the source text into `draft`; request composer focus; announce edit mode.
- `cancelEdit()`: restore `parkedDraft`, clear `editSourceId`, clear `parkedDraft`.
- Send settles successfully in edit mode: restore `parkedDraft`, clear `editSourceId` and `parkedDraft`.
- Send settles in error in edit mode: retain `editSourceId` and the edited `draft` (FR-016).
- Send settles in error in ordinary mode: clear `draft` to the submitted text and request focus (FR-002).
- Conversation switch: store the outgoing state under its id; restore the incoming state or the conversation's persisted draft.

**Validation**: `editSourceId` may only reference a user message in the active conversation. `parkedDraft` is null whenever `editSourceId` is null.

## Settings Draft

The in-memory editable settings in `SettingsSheet`.

| Field                | Type     | Notes                                  |
| -------------------- | -------- | -------------------------------------- |
| `apiKey`             | `string` | Provider key text.                     |
| `s3.bucket`          | `string` |                                        |
| `s3.region`          | `string` |                                        |
| `s3.accessKeyId`     | `string` |                                        |
| `s3.secretAccessKey` | `string` | Never written to status or error text. |
| `s3.endpoint`        | `string` | Absolute HTTPS URL when present.       |

**Lifecycle**

- Hydrated from `SecretService.readSettings()` once, on the first open.
- Retained across close and reopen, including after a failed write (FR-009).
- Flushed on 600 ms idle, blur, keyboard Done, and close.
- API key persistence is independent of the S3 group (FR-004 in 112).
- An incomplete S3 group stays in the draft and never replaces a complete saved group (FR-010).

**Validation** (`validateSettings`): all-empty S3 is valid (`s3: null`); any present S3 value requires bucket, region, access key ID, and secret; endpoint, when non-empty, must be an absolute HTTPS URL.

## Saved Settings

The last complete values persisted to SecureStore. Read-only from the UI's perspective. Never overwritten by a partial group or an invalid import.

## Parked Draft

See Conversation UI State. Invariant: a parked draft is restored exactly once, on successful resend or cancel, and is not discarded by a failed resend.

## Remote Mutation

`MirrorOperation` in `src/sync/mirrorQueue.ts`.

| Field      | Type             | Notes                                                    |
| ---------- | ---------------- | -------------------------------------------------------- |
| `name`     | `string`         | Conversation file name or `manifest.json`.               |
| `revision` | `number`         | Monotonic host counter. Higher wins for the same `name`. |
| `content`  | `string \| null` | `null` means delete remotely.                            |

**Invariants**

- A completed local mutation is persisted to `sync/mirror-queue.json` before any remote attempt (FR-020).
- At most one pending operation exists per `name`; a newer revision replaces an older one (FR-022).
- A flush drains until the map is empty, re-reading between sends so a newer revision is delivered without an unrelated user action.
- Removing S3 configuration clears the queue and performs no remote work (FR-023, 116 FR-013).
- Pending operations survive termination and resume on launch when a complete configuration exists (FR-021).

## Acceptance Record

One entry per design state (01-35) or remediation scenario.

| Field      | Type                            | Notes                                          |
| ---------- | ------------------------------- | ---------------------------------------------- |
| `state`    | `string`                        | State id or scenario name.                     |
| `result`   | `'pass' \| 'fail' \| 'blocked'` |                                                |
| `evidence` | `string`                        | Command output or a named environment blocker. |

**Validation**: a state without passing evidence is `fail` or `blocked`, never `pass` (FR-025).
