# Feature Specification: Edit and Resend Prompts

**Feature Branch**: `spec-109-ios-chat-redesign`
**Created**: 2026-09-13
**Status**: Archived
**Depends on**: [110 iOS Chat Shell and Composer](../110-ios-chat-shell-composer/spec.md)

## User Scenarios & Testing

### User Story 1 - Edit and resend an earlier prompt (Priority: P1)

The user copies an earlier user prompt into the composer, edits it, and sends it as a new message without altering the original exchange.

**Independent Test**: Enter edit mode from multiple user messages, alter the text, send it, and verify the original messages remain and a new user message appears at the conversation end.

### User Story 2 - Cancel or recover an edit (Priority: P1)

The user cancels editing or recovers after a failed resend without losing the prior draft.

**Independent Test**: Start with a non-empty draft, enter edit mode, switch source messages, cancel, fail a resend, and change conversations.

## Requirements

### Functional Requirements

- **FR-001**: Every user message MUST have the 44-point edit-and-resend action defined in visual-spec.md section 7. Assistant messages MUST not have this action.
- **FR-002**: Selecting an action MUST copy the complete source prompt into the composer, focus the native keyboard, park the existing draft in memory, and enter the designed edit mode.
- **FR-003**: The edit-mode row MUST identify `Edit and resend`, provide Cancel edit and resend, mark the source action selected, and announce the mode to accessibility services.
- **FR-004**: Sending from edit mode MUST create a new user message at the end of the same conversation. It MUST preserve the source prompt and all existing replies without a branch selector or destructive rewrite.
- **FR-005**: Successful resend MUST exit edit mode and restore the parked draft or an empty draft. Cancel MUST restore the parked draft without sending.
- **FR-006**: A failed resend MUST retain the edited text and edit mode. Empty edited text MUST disable Send.
- **FR-007**: While any send is pending, edit actions MUST be disabled. Selecting another source in edit mode MUST replace the edit buffer while retaining the originally parked draft.
- **FR-008**: Each conversation MUST retain its own normal draft, edit buffer, source selection, and parked draft when the user switches conversations. Starting a new chat MUST not erase another conversation's draft.

## Success Criteria

- **SC-001**: State 31 meets its documented trigger and visible differences.
- **SC-002**: Editing, cancellation, failed resend, and conversation switching never lose either the original prompt or an existing draft.
- **SC-003**: The user can distinguish selected, busy, and disabled edit actions through accessible state and text.

## Assumptions

- The existing message-action interface may be extended only if it cannot supply stable user-message identity and full source content required by this feature.
