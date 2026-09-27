# Implementation Plan: TOML Settings

**Branch**: `121-toml-settings` | **Date**: 2026-09-27 | **Spec**: [spec.md](spec.md)

## Summary

Add validated TOML imports while retaining JSON/text compatibility. Store the complete active settings snapshot as one TOML value in SecureStore: one replacement write is the import commit boundary. Preserve legacy providerKey/s3 records until migration succeeds. Partial S3 remains a draft and is excluded from commits.

## Technical Context

**Language/Version**: TypeScript 6, React 19.2, React Native 0.86.
**Primary Dependencies**: Expo 57, expo-secure-store, expo-document-picker, expo-file-system, smol-toml.
**Storage**: One protected TOML settings record; legacy protected records retained for recovery. Conversation/manifest JSON unchanged.
**Testing**: Vitest, Testing Library, TypeScript, ESLint, Prettier; Expo bundle smoke check.
**Target Platform**: iOS Expo development client.
**Project Type**: Mobile application.
**Performance Goals**: Bound import input to 1 MiB and parser depth to 16.
**Constraints**: TOML 1.0, UTF-8, no secret diagnostics, atomic eligible-group activation, independent manual autosaves.
**Scale/Scope**: Base apiKey/s3 schema only. Provider endpoint and enabledModels remain extensions owned by specs 123/122; their example keys are rejected until those features exist.

## Constitution Check

PASS before research and after design: `.specify/memory/constitution.md` is an unratified placeholder with no enforceable principles. Design preserves protected storage and existing conversation encoding; no gate violations.

## Project Structure

Feature artifacts: plan.md, research.md, data-model.md, contracts/settings.md, quickstart.md, tasks.md under specs/archive/121-toml-settings/.
Source: src/settings/{settingsImport,settingsToml,settingsValidation,SettingsSheet}.ts(x), src/secrets/secretService.ts.
Tests: tests/settings/ and tests/secrets/. Examples: docs/examples/settings.toml; README.md.

## Complexity Tracking

No constitutional violations. A single protected snapshot avoids a multi-record recovery journal and makes crash recovery select either the complete old or complete new record. Service writes serialize through a queue; all getters read the authoritative snapshot.
