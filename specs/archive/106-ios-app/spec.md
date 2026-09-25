# Feature Specification: iOS App

**Feature Branch**: `spec-106-ios-app`

**Created**: 2026-09-07

**Status**: Archived

**Input**: User description: "The iOS app: the shared chat component running natively on iPhone, with safe areas, keyboards, input composition, dynamic type, focus, text selection, composer growth, scrolling, streaming, and stop. Manual local testing continues until a later spec declares the app ready for App Store work."

## User Scenarios & Testing

### User Story 1 - Chat on iPhone (Priority: P1)

The user chats on their iPhone with the same conversation experience as desktop, including the history drawer, autosave, and key import.

**Why this priority**: iOS is a beta platform; the chat must be fully usable there.

**Independent Test**: On an iPhone, import a key via the document picker, send a prompt, and receive a streamed response using the shared component.

**Acceptance Scenarios**:

1. **Given** the iOS app is installed, **When** the user opens it, **Then** the chat screen renders within the safe areas.
2. **Given** a prompt is sent, **When** the response streams, **Then** it displays and the conversation persists.
3. **Given** no stored API key, **When** the user reaches first send, **Then** the key import flow opens through the platform document picker.

### User Story 2 - Type with the iOS keyboard (Priority: P1)

Composing works with the software and hardware keyboards, including input composition.

**Why this priority**: Text input is the primary interaction; broken keyboard behavior makes the app unusable.

**Independent Test**: Type with the software keyboard, a hardware keyboard, and an input-method editor; confirm composition and sends.

**Acceptance Scenarios**:

1. **Given** the software keyboard is shown, **When** the user types, **Then** the composer grows and sends correctly.
2. **Given** an input-method editor is active, **When** the user composes, **Then** no premature send occurs.

### User Story 3 - Read with dynamic type (Priority: P2)

The user increases text size; the chat adapts.

**Why this priority**: Dynamic type is standard on iOS and cheap to honor.

**Independent Test**: Set the largest dynamic type size; confirm the chat renders without clipping.

**Acceptance Scenarios**:

1. **Given** the largest dynamic type size, **When** the chat renders, **Then** content is readable and not clipped.
2. **Given** the user scrolls during streaming, **When** content arrives, **Then** the scroll behavior matches the component's rules.

### User Story 4 - Manage beta conversations (Priority: P2)

The user opens an overflow menu to access secondary conversation controls and can clear every beta conversation from local storage and S3.

**Why this priority**: Beta testers need a compact chat header and a reliable way to reset test data.

**Independent Test**: Create and sync conversations, open the overflow menu, confirm Clear conversations, and verify that local history and configured S3 conversation objects are empty.

**Acceptance Scenarios**:

1. **Given** the chat screen is visible, **When** the user opens the overflow menu, **Then** it offers New conversation, History, Import S3, and Clear conversations.
2. **Given** the user selects Clear conversations, **When** they confirm the destructive-action dialog, **Then** every local conversation and S3 conversation object is removed and a blank unsaved conversation is shown.
3. **Given** the user selects Clear conversations, **When** they cancel the dialog or an object cannot be removed, **Then** the current conversation data remains available and the app reports the failure.

### Edge Cases

- Safe areas must be respected on all notch and home-indicator layouts.
- Focus and text selection must behave on touch.
- Composer growth and internal scrolling must work on small screens.
- Stop must retain partial content on iOS as on desktop.
- The app backgrounded or terminated mid-stream must not lose partial content (per spec 107).

## Requirements

### Functional Requirements

- **FR-001**: The iOS app MUST run the shared chat component.
- **FR-002**: The app MUST respect safe areas.
- **FR-003**: Composition MUST work with software and hardware keyboards.
- **FR-004**: Input-method editor composition MUST NOT trigger premature sends.
- **FR-005**: The app MUST support dynamic type.
- **FR-006**: Streaming, stop, composer growth, scrolling, and focus MUST behave as on desktop.
- **FR-007**: Conversations MUST persist on iOS using the shared, platform-neutral storage layer (see spec 101).
- **FR-008**: The iOS app MUST implement the history drawer (spec 105), the autosave session flow (spec 107), and key import (spec 103) with the first-send gate (spec 108) using the platform document picker in place of the desktop file chooser.
- **FR-009**: Partial content MUST be saved when the app is backgrounded or terminated, per spec 107.
- **FR-010**: S3 sync (spec 104) is in iOS beta scope.
- **FR-011**: The composer and Send control MUST remain visible above the software keyboard, and the user MUST be able to dismiss that keyboard without sending the draft.
- **FR-012**: Sync status MUST not invoke credential import. S3 import MUST use an explicitly labeled control, and provider-key import MUST occur only through the first-send gate.
- **FR-013**: Secondary conversation controls MUST be presented in an overflow menu containing New conversation, History, Import S3, and Clear conversations.
- **FR-014**: Clear conversations MUST require confirmation, then remove every local conversation and every configured S3 conversation object. If any removal fails, it MUST retain the current in-session conversation and report the failure.

### Key Entities

- **iOS App**: The native app built from the shared component and the shared storage model.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A full chat loop works on an iPhone, including key import and resume.
- **SC-002**: Keyboard and IME flows work without premature sends.
- **SC-003**: Dynamic type renders without clipping.
- **SC-004**: Streaming and stop behave identically to desktop.

## Assumptions

- The iOS app is tested manually through Expo Go on an iPhone connected to the local development server. Cloud builds, Apple Developer Program enrollment, and App Store distribution are out of scope until a later readiness spec includes them.
- Android is out of scope for beta.
- The storage schema layer is platform-neutral per spec 101, so iOS reuses it unchanged.
- Native iOS views are checked manually through Expo Go during the early-beta phase. Automated testing and release validation are deferred to a later readiness spec.
- S3 sync is in iOS beta scope. It uses the existing shared reconciliation rules with an iOS-specific transport and lifecycle scheduler.

## Clarifications

- 2026-09-11: Specs 107 and 108 are completed and merged to `main` before this spec is implemented. Their autosave and first-send key-gate behavior is reused by iOS rather than reimplemented in this spec.
- 2026-09-11: iOS beta includes S3 sync.
- 2026-09-11: After a successful provider-key import initiated by the first-send gate, the retained prompt sends automatically.
- 2026-09-12: A document-picker launch temporarily suppresses lifecycle-triggered autosave. Cancelling a credential import keeps the current unsaved conversation and draft in place without creating a history entry.
- 2026-09-12: The iOS shell measures the overlap between the software-keyboard frame and its chat region, keeping the composer and Send control above system and third-party keyboards without assuming a keyboard vendor or reported-height convention. It shows an app-level keyboard-dismissal control while the keyboard is visible because third-party keyboard extensions do not reliably support input accessories.
- 2026-09-12: The shell renders sync state as status text and uses a separate `Import S3` control, so a user can distinguish S3 configuration from the provider-key import gate.
- 2026-09-12: The beta overflow menu contains New conversation, History, Import S3, and Clear conversations. Clear conversations removes local and configured S3 conversation objects only after an explicit confirmation.
- 2026-09-13: Native E2E automation, EAS build validation, and the physical-iPhone checklist are deferred until the early beta host supports a usable chat loop. They are not completion gates for this implementation phase. A follow-on usability-validation spec will define the test runner, CI workflow, and device acceptance evidence.
- 2026-09-13: All iOS testing is manual through Expo Go on an iPhone connected to `npm run dev:ios` for an indefinite early-beta period. Apple Developer Program enrollment, cloud builds, App Store preparation, distribution, and readiness criteria are deferred until a later spec explicitly declares the app ready for App Store work.
