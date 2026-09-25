# Feature Specification: iOS Chat Redesign Baseline

**Feature Branch**: `spec-109-ios-chat-redesign`
**Created**: 2026-09-13
**Status**: Archived
**Input**: `specs/ios-chat-design/` design package

## Purpose

Make the iOS chat application conform to the supplied design package rather than incrementally modifying the existing early-beta screen. `specs/ios-chat-design/visual-spec.md` is incorporated by reference as the visual and interaction baseline. Its numeric rules, literal labels, state transitions, accessibility behavior, mockup coverage, and exclusions are binding unless this specification explicitly states otherwise.

## User Scenarios & Testing

### User Story 1 - Use the designed iOS chat experience (Priority: P1)

A user sees the designed chat, history, settings, and recovery flows consistently rather than the former overflow-menu shell.

**Independent Test**: Review each state named in `state-index.md` on the target phone size and confirm it matches the applicable numeric and behavioral rules in `visual-spec.md`.

**Acceptance Scenarios**:

1. **Given** any redesigned surface is visible, **When** it is compared with its applicable design state, **Then** it uses the supplied hierarchy, labels, tokens, typography, spacing, and interaction behavior.
2. **Given** a presentation is delegated to iOS, **When** it appears on a supported iOS version, **Then** native variation is accepted only for the menu, alert, sheet, document picker, keyboard, and system chrome identified in the design package.

## Requirements

### Functional Requirements

- **FR-001**: The implementation specifications 110 through 116 MUST use `specs/ios-chat-design/visual-spec.md` and `state-index.md` as their common design input.
- **FR-002**: Every numbered mockup state in `state-index.md` MUST be assigned to an implementation specification and acceptance verification.
- **FR-003**: The iOS application MUST replace the prior overflow-menu navigation with the header, history drawer, model picker, and Settings entry defined by the design package.
- **FR-004**: The beta MUST exclude every feature named out of scope in visual-spec.md, including attachments, voice, search, accounts, image generation, folders, sharing, pinning, archiving, sync controls, and stop generation.
- **FR-005**: Existing assistant-message rendering remains unchanged except where a dependent specification adds the user-message edit-and-resend action.

## Supersessions

The following requirements are intentionally superseded for the iOS redesign only. Desktop behavior is unchanged.

| Archived specification  | Superseded requirement        | Replacement                                                                                                                                                                                |
| ----------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 106 iOS App             | FR-006 and the stop edge case | No stop-generation control is presented. Partial responses still persist through existing autosave behavior.                                                                               |
| 106 iOS App             | FR-012 and FR-013             | The overflow menu, Import S3 action, Clear conversations action, sync-status header, and keyboard-dismiss control are replaced by the designed header, history drawer, and Settings sheet. |
| 108 Provider Key Gate   | FR-001 through FR-004 on iOS  | A missing key disables Send, retains the draft, and opens Settings from the setup notice. Import does not auto-send a prompt.                                                              |
| 105 Chat History Drawer | FR-002 on iOS                 | The drawer shows the latest five conversations by activity with titles only. Model and date are not shown.                                                                                 |
| 104 S3 Sync             | FR-002 on iOS                 | Background retries continue, but visible sync status is replaced by the specified chat-level S3 failure banner and retry action.                                                           |
| 104 S3 Sync             | FR-009 on iOS                 | Local rename and delete mirror to configured S3. A remote failure never reverses or misreports the completed local operation.                                                              |
| 103 Secret Storage      | FR-001 and FR-004 on iOS      | Settings permits direct editing and atomic settings-file import. Secret values remain protected, are never logged, and are not uploaded as credentials.                                    |

## Success Criteria

- **SC-001**: All 35 design states have a named implementation owner and acceptance check.
- **SC-002**: A user can complete chat, conversation management, settings, import, and S3 recovery flows without encountering the former overflow-menu design.
- **SC-003**: The implementation preserves the constitution's save-failure, automatic persistence, and secret-protection guarantees.

## Assumptions

- The target reference frame is iPhone 16 portrait at 393 by 852 logical points. Runtime safe-area, keyboard, text-scale, and native-presentation behavior remains adaptive as stated in the design package.
- The supplied SVGs are the icon source where native system symbols are not used.
- Requirements outside the supersessions remain governed by the archived specifications and the constitution.

## Design-State Allocation

| Specification                              | Mockup states     |
| ------------------------------------------ | ----------------- |
| 110 iOS Chat Shell and Composer            | 01-07, 27, 30     |
| 111 iOS History Management                 | 08-15, 26, 29     |
| 112 iOS Settings and Credentials           | 16-20, 25, 28, 34 |
| 113 iOS Settings File Import               | 21-24             |
| 114 Edit and Resend Prompts                | 31                |
| 115 Transcript Position and Latest Control | 32-33             |
| 116 Local-First S3 Mirror Feedback         | 35                |
