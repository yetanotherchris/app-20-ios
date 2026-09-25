# Quickstart: iOS Chat Redesign Remediation

## Prerequisites

- Node 22+, npm workspaces installed at the repository root.
- The sibling component checkout at `../app-20-llmchat` (same parent directory as this repo).
- For native validation only: macOS with Xcode, or an EAS dev build and an iOS device or simulator.

## Setup

```bash
npm install
npm --prefix ../app-20-llmchat install
```

## Automated checks

Run in this repository:

```bash
npm run lint
npm run typecheck
npm run test
npm run test:e2e:electron
npm run test:e2e:ios
```

`test:e2e:electron` builds the Electron app and runs Playwright. `test:e2e:ios` runs Maestro against an installed iOS development build. The commands do not run each other's application.

Run in the component repository:

```bash
npm --prefix ../app-20-llmchat run lint
npm --prefix ../app-20-llmchat run typecheck
npm --prefix ../app-20-llmchat run test
```

## Focused checks for the corrected paths

```bash
# Activity-derived ordering: draft edits and renames keep manifest order.
npx vitest run tests/chat/conversation.test.ts

# Import rejects duplicates and invalid values without changing the draft.
npx vitest run tests/settings/settingsImport.test.ts

# Mirror queue drains and delivers the newest revision after a mid-flight mutation.
npx vitest run tests/sync/mirrorQueue.test.ts

# Latest-control hysteresis.
npm --prefix ../app-20-llmchat run test -- useAtBottom
```

## Manual iOS validation (blocked in this environment)

1. Build a dev client: `npm run build:ios:dev`.
2. Walk states 01 through 35 in `specs/ios-chat-design/state-index.md` at 320, 375, and 393-point widths and the largest accessibility text size.
3. Record each state as pass, fail, or blocked with evidence in `tasks.md`.

No iOS simulator or device is available on Windows, so this step is recorded as blocked, not passed.
