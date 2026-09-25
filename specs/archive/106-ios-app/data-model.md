# Data Model: iOS App

## iOS Conversation File Port

Implements `ConversationFilePort` for a fixed app-sandbox directory. The shared store supplies bare file names. The port rejects names that are not `manifest.json` or a valid conversation JSON filename, creates the directory before access, and writes a temporary sibling before replacing a destination.

## Secret Services

`SecretKind` remains `provider-key` or `s3`. A document-picker result is read locally, validated with the shared validation rules extracted by spec 103, and stored under a kind-specific secure-store key. UI state contains only availability and typed error information.

## Session Host

The host owns messages, draft, chat status, persisted conversation identity, autosave state, notification state, and history selection. It provides controlled props to `LLMChat.Root`. It delegates automatic persistence and first-send gating to the shared behavior completed by specs 107 and 108.

## Sync State

The UI receives `disabled`, `idle`, `pending`, `syncing`, or `error` plus a typed error code. Credentials and object contents remain in the sync adapter. The queue runs after local persistence, at startup, and when the app returns to the foreground.
