# Data model

- **Revision**: parsed existing Conversation plus strict `updatedAt` instant. Semantic equality recursively sorts object keys, preserves array order and optional provenance, normalizes represented updatedAt instants. Invalid dates invalidate the revision.
- **Destination identity**: SHA-256 of complete settings including credentials; never raw protected values. In-memory epoch fences obsolete in-flight results.
- **Pending operation**: safe bare conversation filename, write/delete marker and revision counter, bound by the containing destination state. Upload bytes come from latest canonical local file.
- **Hold**: safe filename, kind conflict/malformed/local-corrupt, remote raw bytes or absence, observed local baseline. Persists until explicit resolution or delete.
- **Deferral**: safe filename, baseline local raw bytes, candidate remote bytes, active-work observation. Recheck both sides before accepting; divergence becomes conflict even when timestamps differ.
- **Recovery**: raw displaced/candidate bytes (byte arrays retain invalid UTF-8 exactly) with destination and source filename; stored in private sync state, never canonical history or remote manifest.
- **State**: version, destination identity, operations, holds, deferrals, recoveries and legacy suppression tombstones (with reachable confirm-delete/restore actions). Atomic write before releasing protection/progress. Unreadable state fails closed; no silent empty fallback.

Transitions: unconfigured → disabled; configured → reconcile → idle/pending/error; differing equal instants → held; active work → deferred; deferred + changed local → held; deferred + idle unchanged → apply after remote recheck; held + explicit choice + preserved originals → fresh locally committed revision → queue → reconcile. Configuration changes invalidate old operations/candidates but retain recovery.
