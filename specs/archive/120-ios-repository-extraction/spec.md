# Feature Specification: iOS Repository Extraction

**Feature Branch**: `spec-120-ios-repository-extraction`

**Created**: 2026-09-25

**Status**: Draft

## Purpose

Move the iOS Expo application and its supporting specifications from `app-20-desktop` to this repository. The result is a standalone iOS application with no Electron source, configuration, or workspace dependencies.

## Requirements

- **FR-001**: The iOS application MUST run from this repository without an `apps/` workspace directory.
- **FR-002**: Application source MUST reside in `src/`, and automated tests MUST reside in `tests/`.
- **FR-003**: The provider, conversation-storage, and sync modules required by the iOS application MUST be local source modules rather than dependencies on desktop workspace packages.
- **FR-004**: The repository MUST not contain Electron source, Electron build configuration, or Electron test configuration.
- **FR-005**: The iOS chat design package, the iOS redesign remediation specification, and the archived iOS specifications that define the current application behavior MUST be available in this repository.
- **FR-006**: The desktop repository MUST no longer contain the `apps/ios` application or iOS-specific specifications moved by this extraction.

## Success Criteria

- **SC-001**: `npm run lint`, `npm run typecheck`, and `npm run test` pass in this repository.
- **SC-002**: `npm run test:e2e` targets the iOS Maestro suite only.
- **SC-003**: No tracked path in this repository contains Electron application code or Electron test configuration.
