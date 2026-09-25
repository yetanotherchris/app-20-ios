# Feature Specification: Transcript Position and Latest Control

**Feature Branch**: `spec-109-ios-chat-redesign`
**Created**: 2026-09-13
**Status**: Archived
**Depends on**: [110 iOS Chat Shell and Composer](../110-ios-chat-shell-composer/spec.md)

## User Scenarios & Testing

### User Story 1 - Read earlier content while replies arrive (Priority: P1)

The user can read older messages without being pulled to the bottom by streaming content or layout changes.

**Independent Test**: Scroll away from the latest message, stream or append content, open and close the keyboard, grow the composer, and load older items.

### User Story 2 - Return to the latest message (Priority: P1)

The user uses the floating control to return to the conversation end without losing their draft or keyboard state.

**Independent Test**: Scroll beyond the show threshold with and without the keyboard, activate the control, and interrupt its animation by dragging.

## Requirements

### Functional Requirements

- **FR-001**: The transcript MUST use the scrolling, keyboard-dismissal, trailing padding, and anchoring behavior in visual-spec.md sections 8 and 9.
- **FR-002**: When following the latest content, new replies, streaming content, keyboard changes, and composer growth MUST keep the latest content visible.
- **FR-003**: When the user is reading older content, the transcript MUST preserve the visible message identity and within-message offset. New content MUST NOT force scrolling or accessibility focus.
- **FR-004**: The latest control MUST be a centered 44-point floating circle above the complete composer stack. It MUST show only when distance from the end exceeds 80 points, hide at 40 points or less, and retain its current visibility between those thresholds.
- **FR-005**: The latest control MUST remain hidden for an empty, loading, non-scrollable, obscured, or un-restored transcript.
- **FR-006**: Activating the latest control MUST retain draft, selection, and keyboard state; return to the measured end; resume following; and announce `Latest message` when VoiceOver is enabled.
- **FR-007**: Nearby explicit jumps MAY animate for approximately 200 milliseconds. Long jumps and Reduce Motion MUST use an immediate jump. User drag during animation MUST stop it and disengage following.
- **FR-008**: Opening a modal surface MUST hide the control and restore its correct state after chat becomes visible.

## Success Criteria

- **SC-001**: States 32 and 33 meet their documented triggers and visible differences.
- **SC-002**: Streaming while reading older content does not change the user's visible reading position.
- **SC-003**: Returning to latest does not dismiss the keyboard or alter the draft.

## Assumptions

- The feature applies to the existing transcript implementation regardless of whether its underlying list is inverted. Distance and anchors are normalized to the behavior specified here.
