# Research: TOML Settings

## Parser

Decision: smol-toml current maintained parser/stringifier, maxDepth 16, with a lexical TOML 1.0 compatibility check rejecting 1.1 string escapes and inline-table newline/trailing-comma syntax.
Rationale: portable typed ESM/CJS, no Node runtime dependencies; current releases fix parser denial-of-service issues. Schema rejects all dates, numbers, arrays, and nested tables. Parser exceptions never reach UI.
Alternatives: pinning 1.5.2 loses later fixes; @iarna/toml targets 1.0 release candidate; @ltd/j-toml adds Node-oriented APIs and LGPL licensing.
Sources: https://github.com/squirrelchat/smol-toml/releases and https://github.com/squirrelchat/smol-toml.

## Protected persistence

Decision: one complete TOML settings value in SecureStore, with serialized read/modify/write operations. Imports issue one setItemAsync; active readers wait for queued writes, and a failed write leaves the old record authoritative.
Rationale: no multi-key window, rollback journal, or plaintext file. Legacy records are not removed; if migration write fails return the old snapshot and retry next read. Invalid legacy JSON is surfaced safely rather than overwritten.
Alternative: per-group writes plus protected undo journal requires recovery at every read and has more crash boundaries.

## File decoding

Decision: use Expo File.bytes(), preflight size and actual byte limit, explicit UTF-8 validation before decoding (no reliance on Hermes fatal TextDecoder support).
Rationale: string reads cannot reliably distinguish replacement decoding from a valid U+FFFD. A BOM is removed by the parser entrypoint.
Source: https://docs.expo.dev/versions/latest/sdk/filesystem/.

## Scope

Decision: implement base schema only; reserve provider endpoint/models for specs 123/122. FR-010 applies to all currently implemented groups and a whole snapshot is ready to incorporate future provider fields. The extended example in spec.md is forward-looking.
