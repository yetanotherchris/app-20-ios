# iOS Host Contracts

## File Access

```ts
interface ConversationFilePort {
  listFileNames(): Promise<string[]>
  readText(fileName: string): Promise<string>
  writeText(fileName: string, content: string): Promise<void>
}
```

The implementation owns the app directory and never accepts an absolute or caller-selected path.

## Secrets

```ts
type SecretResult = { ok: true } | { ok: false; code: AppErrorCode }

interface SecretService {
  hasProviderKey(): Promise<boolean>
  import(kind: SecretKind): Promise<SecretResult>
  remove(kind: SecretKind): Promise<SecretResult>
  getProviderKey(): Promise<string | null>
  getS3Config(): Promise<S3Config | null>
}
```

`getProviderKey` and `getS3Config` are available only to provider and sync services. No UI component receives their return values.

## Sync

```ts
interface SyncRemote {
  listNames(): Promise<string[]>
  readText(name: string): Promise<string>
  writeText(name: string, content: string): Promise<void>
}
```

The adapter accepts only names emitted by the shared sync engine and maps them below the fixed S3 prefix.
