# app-20-ios

iOS AI chat application built with Expo and React Native.

## Layout

- `src/`: application code and local provider, storage, and sync modules.
- `tests/`: Vitest unit tests and Maestro iOS interaction tests.
- `specs/`: iOS design and feature specifications.

## Commands

- `npm run start`: start the Expo development server for a development client.
- `npm run ios`: start the app in an iOS development client.
- `npm run lint`: check source and tests.
- `npm run typecheck`: run TypeScript without emitting output.
- `npm run test`: run unit tests.
- `npm run test:e2e`: run Maestro iOS interaction tests against an installed build.

## Settings imports

In Settings, choose **Import from TOML file** and select one `.toml` file (UTF-8, at most 1 MiB). See [settings.toml](docs/examples/settings.toml). Comments, quoted strings, S3 tables and dotted keys are supported. Omit a field to preserve its draft value; use `""` to clear it. Unknown fields and non-string values are rejected.

Legacy `.json` settings objects, `.txt` API keys and `KEY=value` files remain supported. Text names are `API_KEY`, `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, and `S3_ENDPOINT`.

A complete or all-empty S3 group saves; incomplete S3 imports remain drafts while eligible provider settings save. Clearing one required S3 field keeps the saved destination active; clearing all S3 fields disables sync after saving. Retry keeps failed imports together. Structured settings migrate from JSON to TOML inside protected credential storage, with legacy records retained for recovery. No settings export or plaintext settings file is created; conversation files and manifests remain JSON.

Settings also includes **API base URL** (default `https://openrouter.ai/api/v1`) and **Manage models**. Discovery loads the saved destination's catalog; search, enable/disable controls and manual exact identifiers share settings autosave and retry. Enabled choices are saved separately for each normalized base URL. Chat uses the selected identifier and retains its provider provenance, requiring a new selection when an endpoint or enabled list makes it incompatible.

TOML imports accept `endpoint = "https://provider.example/v1"` and `enabledModels = ["vendor/model"]`. Omit these fields to preserve their values; `endpoint = ""` resets OpenRouter, and `enabledModels = []` explicitly disables all models for the imported or current endpoint. Endpoint, API key and model preferences supplied together activate in one protected commit.
