# Sync contracts

S3 contains only `conversations/<safe-name>.json` and `conversations/manifest.json`. Listing traverses every continuation token even with absent/stale manifests. Only NoSuchKey/object 404 means absence; permissions and transport failures abort safely. Invalid filenames never reach local or recovery paths.

Coordinator exposes schedule, run/retry, configurationChanged/clear, local mutation serialization, active-work reporting and resolve(name, choice, presentedRemote). State feedback distinguishes history download errors from upload errors. UI offers Keep local / Use remote for conflicts and Repair from local for malformed objects with a valid local revision. Active work blocks resolution; changed remote bytes require another choice.

Local commits precede durable scheduling. Completed response action runs once after terminal success; chunks do not invoke it. Existing draft/rename/delete mirroring remains. Cancellation/failure uses terminal stopped/error statuses rather than completion. History refresh and accepted revision callback preserve selection and safely update an idle live conversation within local coordination.

Held manifest entries retain their remote metadata; held entries missing remotely are omitted rather than replaced with local metadata. Corrupt manifests are not a source of valid entries, but objects are always enumerated. Recovery and settings are never uploaded.
