# Data Model: iOS Chat Redesign Baseline

## Conversation Display State

| Field            | Type           | Purpose                                           |
| ---------------- | -------------- | ------------------------------------------------- |
| `conversationId` | string         | Active conversation identity                      |
| `draft`          | string         | Normal composer text for this conversation        |
| `editSourceId`   | string or null | User message selected for edit and resend         |
| `parkedDraft`    | string or null | Normal draft held while editing a previous prompt |
| `editDraft`      | string or null | Editable copy of the selected source prompt       |
| `manualTitle`    | string or null | User-assigned title retained across autosaves     |

## Settings State

| Field                | Type                                 | Purpose                             |
| -------------------- | ------------------------------------ | ----------------------------------- |
| `apiKey`             | string                               | Protected provider credential draft |
| `s3.bucket`          | string                               | Optional S3 draft field             |
| `s3.region`          | string                               | Optional S3 draft field             |
| `s3.accessKeyId`     | string                               | Optional S3 draft field             |
| `s3.secretAccessKey` | string                               | Protected optional S3 draft field   |
| `s3.endpoint`        | string                               | Optional S3 endpoint draft field    |
| `status`             | `idle`, `saving`, `saved`, `error`   | Local settings persistence status   |
| `revealedSecret`     | `apiKey`, `secretAccessKey`, or null | Currently visible secret field      |

## Mirror Operation

| Field            | Type                          | Purpose                            |
| ---------------- | ----------------------------- | ---------------------------------- |
| `conversationId` | string                        | Locally mutated conversation       |
| `revision`       | string                        | Revision that orders remote writes |
| `kind`           | `save`, `rename`, or `delete` | Remote mutation type               |
| `payload`        | conversation JSON or filename | Remote state to apply              |

The queue replaces an older pending operation for the same conversation with a newer revision. A delete supersedes pending saves for that conversation.
