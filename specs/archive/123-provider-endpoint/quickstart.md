# Validation Guide

From the repository root, use the installed dependencies and run `npm run lint`, `npm run typecheck`, `npm run test` and `npm run format:check`. Run focused catalog, settings, conversation and provider tests during development.

For native acceptance, install an Expo iOS development build, configure a provider fixture supporting model discovery and streaming, then run `npm run test:e2e`. Maestro and a reachable installed iOS build are required. WSL unit tests cannot establish native acceptance.

1. Fresh OpenRouter settings enable and select auto; explicit empty list stays empty after relaunch.
2. Open Settings, load a full catalog, search mixed-case name and identifier, toggle choices without resetting search, close and relaunch. Verify only saved enabled identifiers in chat.
3. Switch between two HTTPS provider fixtures with the same identifier. Their choices remain separate; existing selection requires explicit confirmation after switching. Send two selected identifiers and inspect fixture request bodies.
4. Reopen matching, disabled, foreign-endpoint and legacy conversations. Preserve transcript and verify restoration rules. JSON round trip and S3 transfer preserve credential-free provenance.
5. Exercise empty, unauthorized, offline, malformed and paginated catalogs; retry and refresh preserve choices. Add an unlisted exact identifier and send through ordinary provider error handling.
6. Import endpoint, key and enabledModels together, including omitted endpoint, empty endpoint and empty list. Inject protected storage failure; old active settings remain until retry succeeds. Keep incomplete S3 values as drafts.
7. Change settings during streaming; fixture confirms the active request retains captured destination and model.

Record missing native tooling and unverified scenarios in tasks.md. Archive only completed implementation and repair spec links.

8. Use a provider fixture returning a cross-origin redirect for chat and catalog; confirm the destination records no authenticated request. Exercise cross-origin/path next links, looping pagination and incomplete totals; all fail without publishing partial catalogs.
