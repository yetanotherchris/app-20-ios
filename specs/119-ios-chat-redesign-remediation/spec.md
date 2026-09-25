# Feature Specification: iOS Chat Redesign Remediation

**Feature Branch**: `spec-119-ios-chat-redesign-remediation`

**Created**: 2026-09-23

**Status**: Draft

**Input**: Verified review findings for archived specifications 109 through 116 and `specs/ios-chat-design/`.

## Purpose

Correct the iOS chat redesign defects found after specifications 109 through 116 were implemented. The completed result must restore the required composing, history, settings, import, transcript, and local-first remote-mirror behavior without changing the defined beta scope. `specs/ios-chat-design/visual-spec.md` and `state-index.md` remain the binding visual and interaction baseline.

## User Scenarios & Testing

### User Story 1 - Recover safely while composing or editing a prompt (Priority: P1)

A user can send, retry, edit, and resend prompts without losing the current text, previous draft, focus state, or original conversation content.

**Independent Test**: Fail an ordinary send and an edit-and-resend request. Confirm the appropriate text remains editable, the retry control works, and no duplicate prompt or altered prior exchange appears.

**Acceptance Scenarios**:

1. **Given** a user sends a non-empty draft and the response fails, **When** the error is shown, **Then** the original draft and keyboard state are restored and Send can retry it without duplicating the user message.
2. **Given** a user edits and resends a prior prompt and the response fails, **When** the error is shown, **Then** edit mode and the edited text remain available while the parked normal draft remains intact.
3. **Given** a response is pending, **When** the user views the composer or edit actions, **Then** the composer is read-only and edit actions are unavailable until the response completes.

### User Story 2 - Manage conversations and settings without losing configuration (Priority: P1)

A user can browse recent chats and edit or import local settings while preserving drafts, secret protection, validation feedback, and retry paths.

**Independent Test**: Exercise history loading, large text, invalid rename, partial configuration, failed settings persistence, secret reveal and backgrounding, and invalid imports. Confirm every failure keeps the prior saved data and in-session draft available.

**Acceptance Scenarios**:

1. **Given** a user edits a draft in an older conversation, **When** the history is opened, **Then** draft activity has not changed the last-message ordering.
2. **Given** a user enters a partial optional remote-storage configuration, **When** Settings is closed and reopened, **Then** the partial draft remains available and the last complete saved configuration remains unchanged.
3. **Given** a revealed secret field is visible, **When** the app backgrounds, **Then** the secret is masked before the user returns.
4. **Given** an imported settings file is invalid, **When** validation completes, **Then** neither the displayed draft nor any saved setting has changed.
5. **Given** the app launches or a user selects New chat, **When** saved conversations exist, **Then** the start-conversation panel remains visible until the user selects a conversation from history.

### User Story 3 - Read the transcript and recover remote saves reliably (Priority: P1)

A user can read older messages without unwanted movement, return to the latest message accessibly, and rely on completed local changes being mirrored in their latest form when remote storage is configured.

**Independent Test**: Scroll through a long conversation with keyboard and composer changes, activate the latest control with accessibility enabled, interrupt a remote save, restart the app, make another change, and retry. Confirm reading position, accessibility feedback, and the newest local revision are preserved.

**Acceptance Scenarios**:

1. **Given** a user is 40 to 80 points from the transcript end, **When** content or layout changes, **Then** the latest control retains its prior visibility rather than flickering.
2. **Given** a user activates the latest control, **When** the transcript reaches the end, **Then** the app announces `Latest message` without changing draft, selection, or keyboard state.
3. **Given** a remote save fails and the app is restarted, **When** the user makes a newer local conversation change, **Then** a retry sends the newest local version and does not leave it pending indefinitely.

### User Story 4 - Verify the redesigned iOS experience (Priority: P1)

A developer can verify all affected states on a supported iOS device environment and distinguish automated coverage from native visual and accessibility acceptance.

**Independent Test**: Run automated interaction coverage for every corrected failure path, then validate all states 01 through 35 at required widths and accessibility text sizes with visual and accessibility evidence.

**Acceptance Scenarios**:

1. **Given** the remediation is ready for review, **When** automated checks run, **Then** they exercise the corrected compose, history, settings, import, transcript, and mirror failure paths.
2. **Given** each design state is inspected on the supported iOS environment, **When** its applicable visual and interaction rules are evaluated, **Then** the result records pass, fail, or an identified environment blocker for that state.

## Edge Cases

- A send fails after the pending message is created but before a response is received.
- A user changes a conversation while an edit-and-resend request fails.
- A settings write fails during close, then Settings is reopened before the user retries.
- A remote-storage configuration is partly edited while a complete prior configuration exists.
- A settings import contains duplicate property names, valid API text paired with invalid remote-storage values, or an explicitly empty provided value.
- A remote operation remains queued across app termination and a newer local mutation is made after restart.
- A newer remote mutation is scheduled while an earlier operation is being sent.
- The transcript changes while the user is reading earlier content, the keyboard is interactively dismissed, or a modal surface hides the chat.

## Requirements

### Functional Requirements

- **FR-001**: The implementation MUST preserve the beta scope and the visual, interaction, accessibility, and state rules in `specs/ios-chat-design/visual-spec.md` and `state-index.md`.
- **FR-002**: A failed ordinary send MUST remove its pending duplicate, restore the submitted draft and prior focus state, and permit retry through Send without altering prior messages.
- **FR-003**: A pending send MUST make the composer read-only while retaining its keyboard and focus state, and MUST disable every edit-and-resend action.
- **FR-004**: The chat header MUST provide the defined Conversations control, model selector, and New chat control. Settings MUST remain in the history drawer footer. The selected model entry MUST be visibly selected in its menu.
- **FR-005**: The composer and transcript MUST track actual keyboard-frame changes, including interactive dismissal, and dock with the defined gap without conflicting layout adjustments.
- **FR-006**: Conversation ordering MUST use last-message activity only. Draft edits, opening, and renaming a conversation MUST NOT change that order.
- **FR-007**: The history drawer MUST provide its defined loading, empty, error, retry, scrolling, footer-reachability, and accessibility-text-size behavior.
- **FR-008**: Rename validation MUST prevent an invalid title from being saved and show the applicable validation message within the native rename flow.
- **FR-009**: Settings MUST retain the latest draft, last complete saved configuration, and retry path across close, persistence failure, and reopen. Closing MUST not discard a failed write.
- **FR-010**: Optional remote-storage fields that form an incomplete group MUST remain available in the Settings draft without replacing a complete saved group.
- **FR-011**: Every settings field MUST flush a valid change on blur, keyboard completion, and close, and focused fields with their helper text MUST remain above the keyboard with the defined clearance.
- **FR-012**: Revealed secret fields MUST mask when Settings closes, replacement values are imported, or the app leaves the foreground. Secret values MUST never appear in status or error text.
- **FR-013**: A settings import MUST validate the entire file and merged candidate before it changes the displayed draft or persists any value. Invalid input MUST leave both unchanged.
- **FR-014**: Settings import MUST reject duplicate names in every supported file format and preserve the defined cancellation, loading, success-after-persistence, failure, and secret-masking behavior.
- **FR-015**: Entering edit-and-resend MUST focus the composer, announce the mode, provide the defined source context to accessibility services, and preserve the parked draft.
- **FR-016**: A failed edit-and-resend MUST retain edit mode and the edited text. A successful resend or cancellation MUST restore the parked draft without altering the source exchange.
- **FR-017**: The latest-message control MUST use the defined 80-point show threshold, 40-point hide threshold, and retained visibility between them.
- **FR-018**: The transcript MUST reserve the defined trailing space, preserve reading position while the user is away from the latest content, and announce `Latest message` after an explicit return to latest.
- **FR-019**: The latest-message control and transcript MUST react correctly to streaming content, composer growth, keyboard-frame changes, modal visibility, user-interrupted jumps, and accessibility motion preferences.
- **FR-020**: A completed local conversation mutation MUST be retained for remote delivery before any remote attempt. A remote failure MUST never reverse, misreport, or repeat the local conversation operation.
- **FR-021**: Pending remote mutations MUST resume after application launch when complete remote-storage configuration is available.
- **FR-022**: A newer local mutation, including one made after restart or while an earlier remote operation is active, MUST supersede any older queued mutation for the same destination and be delivered without requiring an unrelated user action.
- **FR-023**: Retrying remote delivery MUST use queued local content only and MUST NOT create a new provider request or alter conversation history.
- **FR-024**: Automated coverage MUST exercise every corrected failure and recovery path in this specification, including persistence across restart and settings draft retention.
- **FR-025**: Native acceptance validation MUST cover states 01 through 35 at 320, 375, and 393-point widths and the largest supported accessibility text size. A state without passing evidence MUST be recorded as failed or blocked, not passed.
- **FR-026**: The iOS app MUST start with an empty conversation. It MAY load history metadata at launch, but MUST NOT load a saved conversation until the user selects it. Selecting New chat MUST keep the empty conversation active.

## Key Entities

- **Settings Draft**: The current editable settings values, including incomplete optional remote-storage values that are not yet active.
- **Saved Settings**: The most recent complete settings values that persisted successfully.
- **Parked Draft**: The ordinary composer text retained while a user edits and resends an earlier prompt.
- **Remote Mutation**: The newest completed local representation of one conversation file or index entry that remains queued until remote delivery succeeds.
- **Acceptance Record**: The result and supporting evidence for one required design state or remediation scenario.

## Success Criteria

- **SC-001**: 100% of automated tests for ordinary-send failure, edit-and-resend failure, settings persistence failure, invalid import, remote retry after restart, and newer mutation during delivery pass.
- **SC-002**: In a six-conversation fixture, editing drafts, opening conversations, and renaming conversations leaves the latest-five order unchanged; adding a user message is the only action that changes the order.
- **SC-003**: 100% of rejected imports leave the visible settings draft and saved settings byte-for-byte unchanged.
- **SC-004**: 100% of interrupted remote-delivery scenarios deliver the newest completed local mutation after retry, without a new provider request.
- **SC-005**: All 35 design states pass native acceptance validation at each required width and accessibility text size, or each unmet state is explicitly recorded as failed or blocked with its evidence.
- **SC-006**: A user can complete failed-send recovery, conversation management, settings editing, settings import, transcript return, and remote retry without losing in-session text or exposing a secret.

## Assumptions

- This remediation changes only the iOS redesign behavior and its verification. Desktop behavior remains outside scope.
- The supplied design package remains the governing design input; no new user-facing feature is added.
- The supported iOS validation environment is available before this feature is declared complete or archived.
- Existing persisted beta data is not migrated. The remediation preserves current data formats unless a later specification explicitly changes them.

## Clarifications

- 2026-09-24: The archived requirement to restore the last conversation does not apply to the iOS redesign. The initial iOS surface is the start-conversation panel; history remains available through the Conversations control.
