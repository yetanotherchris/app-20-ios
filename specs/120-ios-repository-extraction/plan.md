# Implementation Plan: iOS Repository Extraction

Move the Expo application from `app-20-desktop/apps/ios` to this repository root. Preserve its root Expo entry files and place application modules in `src/`. Move unit tests into `tests/`, preserving their feature-based directories.

Copy the platform-neutral provider, storage, and sync implementations into `src/ai`, `src/storage`, and `src/sync`. Replace their workspace package imports with local relative imports. Do not copy Electron source, Electron dependencies, Playwright configuration, or desktop-only tests.

Transfer the iOS design package, active remediation spec, and archived iOS application specs. Update active spec path references to the standalone layout.
