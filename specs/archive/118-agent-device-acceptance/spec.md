# Feature Specification: AI-Driven iOS UI Acceptance Loop

**Feature Branch**: `spec-118-agent-device-acceptance`

**Created**: 2026-09-22

**Status**: Archived

**Input**: User description: "Enable an AI coding agent to change an iOS mobile app, run it on a reusable simulator build, inspect it through visual and accessibility evidence, verify acceptance criteria, and iterate until the criteria pass."

## Overview & Goals

This feature provides a closed feedback loop for an AI coding agent and a human developer to verify iOS mobile UI changes without requiring routine manual device testing. The agent changes the app, runs the required interactions, observes the resulting UI, evaluates acceptance criteria, corrects failures, and produces evidence for the final result.

The primary user is a coding agent operating under a developer's direction. The developer supplies the acceptance criteria, reviews the resulting report, and performs human exploratory testing for defects that automated visual and accessibility evidence cannot reveal reliably.

The feature aims to make routine iOS UI acceptance verification repeatable from a Windows workstation, minimize replacement simulator app builds, and prevent incomplete or unobservable runs from being reported as passed.

## Architecture

The system consists of five collaborating parts:

- **Coding Agent**: Changes the app, initiates runs, interprets observations, makes corrective changes, and reports the outcome.
- **App Workspace and Development Service**: Supplies the current app source changes to an eligible test app.
- **iOS Test App and Simulator Session**: Runs the app and receives the user interactions required by an acceptance run. The session is hosted remotely because the primary workstation cannot host an iOS simulator.
- **Device Control and Observation Service**: Performs UI interactions and returns accessibility representations, visual images, runtime diagnostics, and other run evidence to the coding agent.
- **Build and Distribution Service**: Produces replacement iOS test apps when the existing app cannot exercise the current source changes.

The feedback loop is: define acceptance criteria, determine test-app eligibility, start or attach to a simulator session, perform interactions, capture observations, evaluate each criterion, correct failed criteria when possible, repeat, and publish a final report. A run stops with a pass only when every criterion passes. It stops as failed or inconclusive when a criterion cannot pass, evidence is missing, a dependency is unavailable, or the iteration limit is reached.

## Integration Boundaries

The coding agent needs controlled access to the app workspace, development service, device-control capability, simulator session, and collected evidence. The project must expose stable accessible identifiers and descriptions for controls and meaningful states that acceptance criteria require the agent to find or evaluate.

The primary loop is exploratory and evidence-driven. Separately authored deterministic flows may validate stable paths, but they do not replace the agent's evidence-based evaluation or final reporting. Concrete selections for device control, development delivery, cloud simulator builds, optional deterministic flows, and coding-agent integration are planning decisions.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Complete an iOS Acceptance Loop (Priority: P1)

A developer asks a coding agent to implement a mobile UI change and supplies acceptance criteria. The agent changes the app, starts or attaches to an eligible iOS test app, performs the required user interactions, collects visual and accessibility evidence, evaluates each criterion, and continues correcting the app until the run passes or reports a blocking failure.

**Why this priority**: This is the minimum end-to-end workflow that reduces routine manual UI verification while preserving clear evidence for the developer.

**Independent Test**: A deliberately incomplete screen can be given to the agent with observable acceptance criteria. The agent can identify the failure from collected evidence, make a correction, rerun the same criteria, and report a passing result with the final evidence.

**Acceptance Scenarios**:

1. **Given** an iOS test app that can receive the current source changes and a defined acceptance run, **When** the agent starts the run, **Then** it completes the specified interactions and records the evidence used to assess every criterion.
2. **Given** evidence that a criterion is not met, **When** the agent can safely make an app change, **Then** it performs another run after the change and reports whether the criterion now passes.
3. **Given** all criteria are met, **When** the agent finishes the run, **Then** it reports a pass result, the criteria evaluated, and the final evidence locations.

---

### User Story 2 - Reuse an Eligible iOS Test App (Priority: P2)

A developer working on Windows asks the agent to verify a source-only UI change. The agent determines whether an existing iOS test app remains eligible, reuses it when possible, and obtains a replacement only when a change requires one.

**Why this priority**: Reusing a suitable test app avoids unnecessary wait time and limited build capacity while keeping the feedback loop available for routine changes.

**Independent Test**: With both an eligible existing test app and a change that does not alter the native app boundary, the agent can run an acceptance loop without requesting a replacement app. With a change that does alter that boundary, it reports that replacement is required before testing continues.

**Acceptance Scenarios**:

1. **Given** a reusable iOS test app and a source-only change, **When** the agent prepares an acceptance run, **Then** it uses that app without requesting a new build.
2. **Given** a change that cannot be exercised by the available iOS test app, **When** the agent prepares an acceptance run, **Then** it identifies the reason, requests or starts a replacement build, and does not misreport the criteria as passed before the replacement is available.
3. **Given** no reachable iOS test app, **When** the agent prepares an acceptance run, **Then** it reports the unavailable dependency and the action needed to resume testing.

---

### User Story 3 - Diagnose an Inconclusive Run (Priority: P3)

A developer reviews a failed or incomplete automated run. The agent provides the interaction history, accessibility evidence, screenshots, and relevant runtime output so the developer can distinguish an application defect from an unavailable test environment or unobservable criterion.

**Why this priority**: A closed loop is only trustworthy when it explains failures and does not treat missing evidence as a passing result.

**Independent Test**: Interrupting evidence capture or making a target control unavailable produces an incomplete result with the missing evidence and next required action, rather than a false pass.

**Acceptance Scenarios**:

1. **Given** a criterion cannot be assessed because required evidence is unavailable, **When** the agent completes the run, **Then** it marks that criterion inconclusive or failed and names the missing evidence.
2. **Given** an interaction fails or the app reports a runtime error, **When** the agent reports the run, **Then** it includes the failed step and the relevant diagnostic output.

### Edge Cases

- The test app is reachable but cannot load the current source changes.
- A target element appears visually but has no accessible identifier or description that the agent can use to locate it reliably.
- The screenshot and accessibility evidence disagree about the visible UI state.
- A cloud build, simulator session, or development server becomes unavailable during a run.
- A test run reaches its configured iteration limit while one or more criteria still fail.
- An acceptance criterion requires a visual judgment that cannot be determined reliably from the captured evidence.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST let a coding agent initiate an iOS UI acceptance run from a defined set of acceptance criteria and an identified app workspace.
- **FR-002**: The system MUST let the agent start a new iOS test session or attach to a reachable existing session before it performs UI interactions.
- **FR-003**: Before evaluating acceptance criteria, the system MUST determine and report whether the available iOS test app is installed and reachable, can receive the current source changes, and has the required native capabilities and app configuration for the acceptance run.
- **FR-004**: The system MUST reuse an eligible iOS test app for a source-only change. A source-only change does not modify the app's native capabilities, app configuration, or installed dependency set.
- **FR-005**: The system MUST require a replacement iOS test app when a change modifies the app's native capabilities, app configuration, or installed dependency set, and MUST identify the change category that required replacement.
- **FR-006**: The system MUST let the agent perform the taps, text entry, scrolling, navigation, and other user interactions required by an acceptance run.
- **FR-007**: The system MUST capture an accessibility representation and a visual image of the app at each assessment point required by the acceptance criteria.
- **FR-008**: The system MUST make captured evidence available to the agent during the same run so it can determine the next action.
- **FR-009**: The system MUST let the agent revise the app and repeat failed acceptance steps until all criteria pass, a configured iteration limit is reached, or an external dependency blocks progress.
- **FR-010**: The system MUST require every acceptance run to state its iteration limit before the first interaction. The final report MUST state the limit, the number of completed iterations, and whether the limit ended the run.
- **FR-011**: The system MUST report each criterion as passed, failed, or inconclusive and MUST not report an overall pass when any criterion is failed or inconclusive.
- **FR-012**: The system MUST retain the run's interaction history, evidence references, outcome for each criterion, and relevant runtime diagnostics in a developer-readable report.
- **FR-013**: The system MUST report an unavailable simulator, app, development server, build, or evidence capture capability as a blocking condition with the action needed to resume.
- **FR-014**: The system MUST provide project guidance for stable, accessible UI identifiers and descriptions so agents can reliably locate and assess important controls.
- **FR-015**: The system MUST support a primary exploratory feedback loop and MAY support separately defined deterministic acceptance flows without changing the primary loop's reporting requirements.

### Key Entities

- **Acceptance Run**: One evaluation attempt containing its target criteria, app revision, session state, iteration limit, interaction history, and outcome.
- **Acceptance Criterion**: A verifiable expected user-visible outcome and the evidence required to assess it.
- **Test App**: An installed iOS application instance with eligibility information that determines whether it can test the current source changes.
- **Observation**: A timestamped accessibility representation, visual image, or runtime diagnostic captured during a run.
- **Run Report**: The developer-readable record that links criteria, observations, interactions, failures, and final status.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: For a source-only UI change with an eligible running iOS test app, an agent can begin the first acceptance interaction within 5 minutes of receiving the change and criteria under normal network conditions.
- **SC-002**: In a representative set of 20 defined acceptance runs, the system records visual and accessibility evidence for 100% of assessment points that complete without an environment failure.
- **SC-003**: In a representative set of 20 defined acceptance runs containing at least one deliberate UI defect, the final report identifies the defect as failed or inconclusive in at least 19 runs and never reports it as passed.
- **SC-004**: A developer can determine the final status and inspect the evidence for every evaluated criterion from a completed run report without manually repeating the recorded interactions.
- **SC-005**: For an acceptance run blocked by an unavailable dependency, the report identifies the blocker and required recovery action in 100% of observed cases.

## Assumptions

- The primary development workstation runs Windows and has no locally hosted iOS simulator.
- iOS is the only mobile target in scope for this feature. Android testing and Android-specific requirements are excluded.
- A cloud-provided iOS simulator app can be obtained, installed, and reused when it remains eligible for the source changes under test.
- The developer or acceptance-run definition sets the iteration limit before the run begins.
- A developer supplies observable acceptance criteria and retains responsibility for human exploratory testing of less obvious defects.
- Testable app screens expose stable identifiers and accessible descriptions for controls and meaningful UI states.
- Build capacity is limited relative to test-run capacity; the workflow favors reuse of eligible test apps over replacement builds.
- The agent has permission to modify the app workspace, control the test session, and read the resulting evidence.
