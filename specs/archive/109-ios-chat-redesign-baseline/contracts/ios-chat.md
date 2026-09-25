# iOS Chat Contracts

## Conversation Store

```ts
rename(id: string, title: string): Promise<Conversation>
delete(id: string): Promise<void>
```

`rename` validates and atomically persists the changed conversation and manifest entry. `delete` removes the conversation and manifest entry only after the local operation completes.

## Protected Settings

```ts
readSettings(): Promise<SettingsSnapshot>
saveApiKey(apiKey: string): Promise<void>
saveS3Config(config: CompleteS3Config | null): Promise<void>
```

The read result contains stored values only. A partial S3 form is not a sync configuration. Values are never returned through status or error strings.

## Settings Import

```ts
parseSettingsImport(name: string, bytes: string): ImportResult
```

The parser returns either a complete patch of supplied values or an actionable non-secret error. It does not write storage or mutate a draft.

## Mirror Queue

```ts
schedule(operation: MirrorOperation): void
retry(): Promise<void>
```

Remote work begins only after local persistence. `retry` replays pending remote mutations and never invokes the chat provider.
