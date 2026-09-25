# Contract: iOS Host Module Changes

## `src/chat/conversation.ts`

`toConversation(value, base)` derives `updatedAt` from the newest message `createdAt`, falling back to `base.updatedAt` and then `value.createdAt`.

- Draft-only saves keep the previous `updatedAt`, so opening, editing, or renaming a conversation does not change manifest order (FR-006).
- A new user or assistant message carries a newer `createdAt`, which changes the order.

## `src/settings/settingsImport.ts`

`parseSettingsImport(name, raw)` returns `{ ok: true; patch }` or `{ ok: false; error }`.

- Rejects duplicate property names in JSON (token scan) and in text (`KEY=` lines).
- Rejects unknown names, invalid types, an empty file, and input over 1 MiB.
- Rejects syntactically invalid provided values: bucket against the S3 bucket pattern, region against the region pattern, endpoint unless an absolute HTTPS URL, secret access key and access key ID unless non-empty.
- Accepts an explicitly provided empty string as a clear for that value.
- On rejection, no value is returned, so the caller changes neither the draft nor saved settings (FR-013, FR-014).

## `src/settings/SettingsSheet.tsx`

- Hydrates the draft from `SecretService.readSettings()` once per mount, on the first open.
- Retains the draft across close and reopen, including after a failed write.
- Flushes on 600 ms idle, blur, keyboard Done, and close; writes are serialized and coalesce the latest draft.
- A failed write keeps the draft and the last complete saved configuration and shows the retry row.
- Clears revealed secrets on close, on import, and when the app leaves the foreground (FR-012).
- The form uses `automaticallyAdjustKeyboardInsets` so a focused field and its helper stay above the keyboard.

## `src/sync/mirrorQueue.ts`

```ts
schedule(operation: MirrorOperation): Promise<void>
run(): Promise<void>
clear(): Promise<void>
```

- `schedule` persists the operation before calling `run`, and a newer `revision` for the same `name` replaces an older one.
- `run` serializes work and re-runs if operations remain.
- `flush` drains until the map is empty, re-reading each iteration so a revision that arrives mid-flight is sent.
- On remote failure, state is `error` and operations remain persisted for retry.

## `src/chat/IosChatScreen.tsx`

- Header controls: Conversations, model menu (`@expo/ui`), Settings.
- On a settled send, inspects the new assistant message status:
  - ordinary send error: remove the new user and assistant messages, restore the submitted text, request composer focus;
  - edit-and-resend error: retain edit mode and the edited text;
  - edit-and-resend success: restore the parked draft and exit edit mode.
- Passes `followThreshold={40}`, `scrollToLatestShowThreshold={80}`, and `listTrailingPadding={68}` to `LLMChat.Root`.
- Calls `sync.run()` on mount when a complete S3 configuration exists.
- Uses one keyboard-frame owner (`keyboardWillChangeFrame` / `keyboardWillHide`).
