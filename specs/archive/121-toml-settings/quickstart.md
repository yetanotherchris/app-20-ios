# Validation

Prerequisites: Node/npm dependencies; iOS development build for manual device checks.

Run `npm test`, `npm run typecheck`, `npm run lint` and Prettier on changed files. Run Expo iOS export to verify parser bundling.

Import docs/examples/settings.toml; verify comments and strings accepted, masked secrets, unspecified values retained. Import legacy JSON/text files. Cancel picker and import duplicate/unknown/typed/oversized/invalid UTF-8 files; values stay unchanged.

Import bucket-only S3 with an API key: provider commits, completion status remains, saved S3 stays unchanged. Clear one saved S3 required field then all fields: first retains active destination, second disables after save. Inject protected write failure and Retry: old complete settings remain active until success.

Seed legacy providerKey and JSON s3; launch and relaunch, preserving raw API key. Fail migration write, reload/retry and verify legacy records remain. Simulate termination immediately before/after the sole snapshot write to verify complete old/new recovery.

Device checks require macOS/iOS tooling and are recorded separately when available.

## Recorded results (2026-09-27)

- Full Vitest suite: 19 files, 158 tests passed, including import failures, UTF-8, migration recovery, atomic commits and focus-event save suppression.
- TypeScript and ESLint passed.
- Expo iOS export succeeded: 1610 modules, Hermes bundle generated under ignored `.expo/spec-121-export`.
- Changed-file Prettier check passed.
- Spec checklist: 12/12 checked. No extension hook configuration exists.
- PowerShell 7.4.13 installed in WSL at `~/.local/share/powershell`, launcher `~/.local/bin/pwsh`; prerequisite helper passed with Linux paths.
- Device picker behavior, real Keychain failure/termination injection and Maestro were not run: no iOS simulator/device tooling in WSL. Automated storage tests model complete record replacement before/after the commit boundary.

Independent code, requirements/design and security reviews passed after remediation; see [review.md](review.md). The completed spec is archived; native acceptance limitations above remain explicit.
