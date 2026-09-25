# Research: iOS Chat Redesign Remediation

Phase 0 decisions. Each entry states the decision, why it was chosen, and the alternatives evaluated. Evidence was read from the pinned `app-20-llmchat` type definitions and runtime, the sibling `../app-20-llmchat` checkout, and the `apps/ios` sources.

## R1: Latest-control visibility belongs in the shared component

**Decision**: Add opt-in `scrollToLatestShowThreshold` to `useAtBottom` and `MessageList`. When set above the follow threshold, the overlay uses hysteresis: show when `distanceFromBottom > showThreshold`, hide when `distanceFromBottom <= followThreshold`, retain otherwise. When unset, visibility is `!isAtBottom`, preserving current behavior.

**Rationale**: The overlay is rendered inside `MessageList` (`src/components/LLMChat.Conversation.tsx`), and its visibility is `!isAtBottom` computed by `useAtBottom` (`src/hooks/useAtBottom.ts`). The host cannot observe raw distance or override overlay visibility. The follow threshold (auto-scroll and unread) stays separate at 40; the show threshold is 80.

**Alternatives considered**: Passing `followThreshold={80}` alone gives no hysteresis (a single threshold). Implementing the transcript in the host duplicates the shared renderer. Both rejected.

## R2: Transcript trailing space is an opt-in prop

**Decision**: Add `listTrailingPadding` to `MessageList` and `Chat`, applied as `paddingBottom` on the list content container. The iOS host passes 68; the default is 0.

**Rationale**: The design reserves 68 points so the floating control and message actions stay clear of the transcript end. The shared list content currently sets only horizontal padding. A default of 0 keeps the Electron and web surfaces unchanged.

**Alternatives considered**: Hard-coding 68 in the component changes desktop layout without a desktop spec. Rejected.

## R3: "Latest message" is announced on explicit activation

**Decision**: On explicit `scrollToLatest` activation, when a screen reader is enabled, call `AccessibilityInfo.announceForAccessibility(announcement)` with `announcement` defaulting to `Latest message`. Add a small `useScreenReaderEnabled` hook subscribing to `screenReaderChanged`.

**Rationale**: The requirement is an explicit-activation announcement only; passive incoming messages must not steal focus. `AccessibilityInfo` is the native surface. The `MessageList` already owns the activation callback.

**Alternatives considered**: Setting an `accessibilityLiveRegion` on the list would announce on passive updates. Rejected because the spec forbids announcing on passive content.

## R4: Conversation order is derived from message activity

**Decision**: In `apps/ios/src/chat/conversation.ts`, set `updatedAt` from the newest message `createdAt`, falling back to the base conversation's `updatedAt` and then `createdAt`. Draft-only autosaves therefore do not change the manifest order.

**Rationale**: `createConversationStore.save` writes the manifest entry from `conversation.updatedAt` (`packages/conversation-storage/src/manifest.ts`), and `sortManifestEntries` orders by `updatedAt`. The current `toConversation` stamps `new Date()` on every save, so draft edits and any save reorder history. `store.rename` already preserves `updatedAt`.

**Alternatives considered**: Suppressing the manifest write on draft-only saves would leave the manifest's title/model stale. Deriving from activity keeps every save correct.

## R5: Settings retain an in-memory draft across close and reopen

**Decision**: In `SettingsSheet`, hydrate from `SecretService.readSettings()` only on the first open, and keep the in-memory draft thereafter. A failed write retains the draft and the last complete saved configuration; the retry row re-attempts `save(latestDraft)`.

**Rationale**: The current `visible` effect re-reads storage on every open, overwriting a retained draft. The design requires that reopening resumes the retained draft, and that a failed write is not discarded.

**Alternatives considered**: Writing every keystroke to SecureStore would activate partial S3 groups and lose the last complete configuration. Rejected in spec 109 and still rejected.

## R6: Import validates provided values and rejects duplicate JSON names

**Decision**: Extend `parseSettingsImport` to detect duplicate JSON property names with a tokenizing scan, and to reject syntactically invalid provided values (bucket pattern, region pattern, absolute HTTPS endpoint, non-empty secret shapes). The merged candidate is computed and validated before the draft state is set; invalid input leaves the draft and saved settings unchanged.

**Rationale**: `JSON.parse` silently keeps the last duplicate, and the current parser only checks key names and types, so invalid remote-storage values reach the draft before validation. FR-013 and FR-014 require full validation before any mutation. Incomplete-but-syntactically-valid S3 groups remain a draft, matching the design.

**Alternatives considered**: Validating only after merge changes the displayed draft before rejection. Rejected.

## R7: Failed sends roll back the pending pair; failed resends keep edit mode

**Decision**: The host records the pre-submit message ids and the submitted text. When an operation settles at `idle`, it inspects the new assistant message status. On `error` for an ordinary send it removes the new user and assistant messages, restores the draft, and focuses the composer. On `error` for an edit-and-resend it keeps edit mode and restores the edited text. On success for an edit-and-resend it restores the parked draft and exits edit mode.

**Rationale**: `useChatSession.submit` appends a user message and a pending assistant message; `fail` marks the assistant message `error` and returns status to `idle` (`src/session/useChatSession.ts`). The host owns the draft and edit state, so it must perform the rollback. `replaceMessages` is the available mechanism.

**Alternatives considered**: Leaving the error assistant message and using the component retry action diverges from the design's Send-retry semantics and the "no duplicated user bubbles" rule. Rejected.

## R8: The mirror queue drains until empty and resumes on launch

**Decision**: Rewrite `MirrorQueue.flush` to loop while operations remain, re-reading the map each iteration so a newer revision for the same name supersedes and is delivered. `run` re-runs if operations remain after a flush. The host calls `sync.run()` on mount when a complete S3 configuration exists.

**Rationale**: The current flush iterates a snapshot taken at flush start and does not re-run when a newer mutation arrives mid-flight, so the newer mutation can stay pending until an unrelated foreground event. The queue file already persists operations before any remote attempt.

**Alternatives considered**: A second `run()` call from `schedule` returns the active promise and does not start a new flush. Rejected.

## R9: Native model selector uses `@expo/ui`

**Decision**: Add `@expo/ui` 57.0.19 and render the model selector as a native SwiftUI menu with the selected entry checked.

**Rationale**: `ActionSheetIOS` cannot mark a selected option, and the design requires a visible selection. `@expo/ui` matches SDK 57 and is maintained by Expo.

**Alternatives considered**: A checkmark glyph prefix on an action sheet is not a native menu with a real checkmark. A hand-written Swift module cannot be compiled here. Both rejected.

## R10: Rename validation stays in `Alert.prompt`

**Decision**: Keep the native `Alert.prompt`. Enforce 1-80 trimmed characters; on invalid input, re-present the alert with `Enter a name.` or `Use 80 characters or fewer.` as the message. No invalid title is saved.

**Rationale**: `Alert.prompt` is a native iOS alert and can show a message. It cannot disable its Save button; re-presenting keeps the correction inside the native flow.

**Alternatives considered**: The current code routes validation to the history error banner, which is the mutation-failure pattern, not the rename-validation pattern. A Swift module is unverifiable here. Both rejected.

## R11: The component dependency is repinned to a pushed commit

**Decision**: Implement the component changes on a `spec-119-ios-chat-redesign-remediation` branch in `../app-20-llmchat`, build and test there, push it, and set `apps/ios/package.json` to that commit. The current pin (`8d65421`) predates the `v1.0.70` composer and transcript support and is already reported invalid by `npm ls`.

**Rationale**: The iOS source already uses `composerVariant` and `renderAboveComposer`, which do not exist at `8d65421`. A git dependency must resolve from a pushed commit for CI and EAS.

**Alternatives considered**: A `file:` link to the sibling checkout does not resolve in CI. Rejected.

## R12: One keyboard-avoidance owner in the chat

**Decision**: Track `keyboardWillChangeFrame` and `keyboardWillHide` and apply a single bottom inset to the chat region. Remove any competing automatic inset. Do not add a `KeyboardAvoidingView` around the composer.

**Rationale**: The current code listens only to `keyboardDidShow`/`keyboardDidHide`, so interactive dismissal and frame changes are missed, and it mixes a measured inset with the component's own layout. One owner avoids the double gap the design calls out.

**Alternatives considered**: A root `KeyboardAvoidingView` with `behavior="padding"` is offered by the design as one option, but combining it with the existing manual inset would double-count. Keeping the manual owner and broadening the events is the smaller change.

## R13: Native acceptance is recorded, not executed

**Decision**: FR-025 native acceptance for states 01-35 is recorded as blocked in `tasks.md` and the PR, matching spec 109's T019. No state is claimed as passed without evidence.

**Rationale**: This environment is Windows with no iOS simulator or device, and EAS Simulator was unavailable for the account (spec 109 verification record). Claiming a pass would be false.

## R14: Composer autogrowth is pinned to the shared-component fix commit

**Decision**: Pin `app-20-llmchat` to commit `3b73b67` until its package release is available from the registry.

**Rationale**: The component's native multiline input relies on a content-size callback that can arrive after layout. The fix establishes the minimum height from explicit newline count immediately and keeps measured wrapping behavior. The commit is pushed and reproducible, while publishing `1.0.81` from this environment was rejected by the registry.

**Alternatives considered**: Editing the installed dependency would not survive CI or EAS builds. Deferring the app fix until registry publishing would leave the reported Return-key defect unresolved. Both rejected.
