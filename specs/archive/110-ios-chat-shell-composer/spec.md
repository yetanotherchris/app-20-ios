# Feature Specification: iOS Chat Shell and Composer

**Feature Branch**: `spec-109-ios-chat-redesign`
**Created**: 2026-09-13
**Status**: Archived
**Depends on**: [109 iOS Chat Redesign Baseline](../109-ios-chat-redesign-baseline/spec.md)

## User Scenarios & Testing

### User Story 1 - Compose and send a message (Priority: P1)

The user writes and sends a message using the designed two-row composer.

**Independent Test**: Type one line, multiple lines, and more than eleven lines. Confirm the composer dimensions, enabled states, keyboard position, internal scrolling at the cap, and send recovery match states 01-06 and 27.

**Acceptance Scenarios**:

1. **Given** an empty new chat, **When** the user enters no non-whitespace text, **Then** Send is disabled and the placeholder reads `Ask anything`.
2. **Given** a valid draft and available provider key, **When** the user sends it, **Then** one pending message is created, the input and edit controls become unavailable, and the keyboard remains visible if it was visible.
3. **Given** a request fails, **When** the failure is reported, **Then** the draft, focus state, and retryable Send action are restored without a duplicate user message.

### User Story 2 - Navigate chat surfaces (Priority: P1)

The user reaches conversations, model selection, and Settings through the designed header.

**Independent Test**: Open each header control from focused and unfocused chat. Confirm the keyboard dismisses and the correct surface opens.

**Acceptance Scenarios**:

1. **Given** the chat is visible, **When** the user selects the conversations control, **Then** the full-screen history drawer opens.
2. **Given** the model capsule is selected, **When** the native menu opens, **Then** `Openrouter Auto` is selected and is the only entry unless existing configuration supplies additional entries.
3. **Given** Settings or a model menu opens, **Then** the composer does not gain focus when that surface closes.

### User Story 3 - Resolve missing provider setup (Priority: P1)

The user retains a draft when no provider key is configured and can enter setup from chat.

**Independent Test**: Remove the provider key, type a prompt, and confirm state 30 disables Send, retains the text, and opens Settings without a request.

## Requirements

### Functional Requirements

- **FR-001**: The chat root MUST use the header, color, typography, safe-area, and responsive-layout rules in visual-spec.md sections 2, 3, and 5.
- **FR-002**: The composer MUST be one rounded outer rectangle with text above a right-aligned 44-point Send action. It MUST follow the exact geometry and eleven-line cap in visual-spec.md section 6.
- **FR-003**: The composer MUST dock to the actual software keyboard frame with an 8-point gap and use no competing keyboard-avoidance owner.
- **FR-004**: Whitespace-only drafts, missing provider keys, unavailable models, and pending sends MUST disable Send. A pending send makes the input read-only but preserves keyboard and focus state.
- **FR-005**: Failed sends MUST retain the draft, remove the pending duplicate, report an inline error, and retry through Send using the existing idempotent request semantics.
- **FR-006**: A missing provider key MUST show the designed setup notice, retain the editable draft, disable Send, and enter Settings only on the user's explicit activation.
- **FR-007**: The header MUST have a Conversations control, centered model capsule, and Settings control. It MUST NOT render the former overflow menu, sync-status text, Clear conversations action, Import S3 action, or app-level keyboard-dismissal control.
- **FR-008**: The model label MUST be exactly `Openrouter Auto` and additional configured entries, if any, MUST be presented in the same native menu.
- **FR-009**: The chat MUST provide all accessibility names, states, minimum 44-point targets, Dynamic Type adaptation, and Reduce Motion behavior assigned to the header and composer in visual-spec.md sections 5, 6, and 17.
- **FR-010**: Tapping unoccupied transcript or empty-state space MUST dismiss the keyboard without changing the draft.

## Success Criteria

- **SC-001**: States 01-07, 27, and 30 meet their design-state triggers and visible differences.
- **SC-002**: On 320, 375, and 393-point widths, the composer and all header controls remain visible and operable with the keyboard open.
- **SC-003**: Failed, missing-key, and pending-send paths preserve the user's unsent content.

## Assumptions

- Existing request streaming and autosave behavior remains in place. This feature changes its iOS presentation and missing-key entry point.
- The native keyboard supplies dictation, prediction, selection, paste, autocorrection, and capitalization. The application does not emulate those controls.
