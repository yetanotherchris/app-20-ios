# Feature Specification: iOS History Management

**Feature Branch**: `spec-109-ios-chat-redesign`
**Created**: 2026-09-13
**Status**: Archived
**Depends on**: [109 iOS Chat Redesign Baseline](../109-ios-chat-redesign-baseline/spec.md)

## User Scenarios & Testing

### User Story 1 - Browse recent chats (Priority: P1)

The user opens the full-screen drawer, sees the five most recent chats, and opens one without losing its draft.

**Independent Test**: Create six chats with known activity order, open the drawer, and verify the latest five, selected row, empty/loading/error states, and close behavior.

### User Story 2 - Rename or delete a chat (Priority: P1)

The user manages a conversation from its native action menu.

**Independent Test**: Rename a chat with valid and invalid titles, delete active and inactive chats, and force local mutation failures.

**Acceptance Scenarios**:

1. **Given** a conversation row, **When** its ellipsis or long press opens the menu, **Then** native Rename and Delete actions remain inside safe screen bounds.
2. **Given** Rename is selected, **When** the title is blank, whitespace-only, or longer than 80 characters, **Then** Save is disabled and the correct helper text appears.
3. **Given** the active conversation is deleted successfully, **When** the deletion completes, **Then** a new empty unfocused chat becomes active.

## Requirements

### Functional Requirements

- **FR-001**: The history surface MUST be an opaque, full-screen drawer with the hierarchy, fixed header/footer, sizing, and motion behavior in visual-spec.md section 9.
- **FR-002**: The drawer MUST show the five latest conversations ordered by last-message activity descending. Rename and open actions MUST NOT reorder them. Activity ties MUST use stable identifiers.
- **FR-003**: Rows MUST show title only, use an accessible full title, highlight the selected conversation, and provide New chat, Close conversations, Settings, and Conversation actions controls with the specified labels.
- **FR-004**: Empty, loading, list-error, and local-mutation-error states MUST match states 09-11 and 29. A list error MUST leave retry available; mutation failures MUST keep the original row intact.
- **FR-005**: New chat MUST preserve other conversation drafts, start unfocused, and create a persisted history entry only after the first successfully saved user message.
- **FR-006**: Untitled conversations MUST derive their title from the first 80 characters of the first user message until renamed.
- **FR-007**: Rename MUST trim surrounding whitespace and accept one through 80 characters. Delete MUST require the native destructive confirmation.
- **FR-008**: At accessibility text sizes, titles MUST wrap without a line cap, rows MUST grow, the list MUST scroll, and the footer MUST remain reachable.
- **FR-009**: The drawer MUST not include search, metadata rows, swipe actions, account controls, or a clear-all action.
- **FR-010**: The Settings footer label MUST show the installed native build number as a short `b`-prefixed value and announce that number to assistive technology.

## Success Criteria

- **SC-001**: States 08-15, 26, and 29 meet their documented triggers and visible differences.
- **SC-002**: A user can resume, rename, delete, or create chats without losing a draft or changing a conversation after a failed local mutation.
- **SC-003**: All five rows and the Settings footer are reachable at the largest supported text size.

## Assumptions

- Existing storage provides conversation titles, identifiers, drafts, and activity timestamps. This feature defines only their iOS display and mutation behavior.
