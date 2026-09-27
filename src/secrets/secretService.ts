import { parseSettingsToml, serializeSettingsToml } from '../settings/settingsToml'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system/legacy'
import * as SecureStore from 'expo-secure-store'

export type SecretKind = 'provider-key' | 's3'
export type SecretErrorCode = 'chooser-cancelled' | 'invalid-secret' | 'multiple-secrets' | 'unknown'
export type SecretResult = { ok: true } | { ok: false; code: SecretErrorCode }

export interface S3Config {
  accessKeyId: string
  secretAccessKey: string
  bucket: string
  region: string
  endpoint?: string
}

export interface SettingsSnapshot {
  apiKey: string
  s3: {
    accessKeyId: string
    secretAccessKey: string
    bucket: string
    region: string
    endpoint: string
  }
}

export interface SecretService {
  hasProviderKey(): Promise<boolean>
  import(kind: SecretKind): Promise<SecretResult>
  getProviderKey(): Promise<string | null>
  getS3Config(): Promise<S3Config | null>
  readSettings(): Promise<SettingsSnapshot>
  commitSettings(apiKey: string, s3?: S3Config | null): Promise<void>
  saveApiKey(value: string): Promise<void>
  saveS3Config(config: S3Config | null): Promise<void>
}

const PROVIDER_KEY_STORAGE_KEY = 'providerKey'
const S3_STORAGE_KEY = 's3'
const S3_BUCKET_PATTERN = /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/
const S3_REGION_PATTERN = /^[a-z0-9-]+$/

function invalid(): SecretResult {
  return { ok: false, code: 'invalid-secret' }
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function parseObject(raw: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(raw.trim())
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return null
    return value as Record<string, unknown>
  } catch {
    return null
  }
}

function validateProviderKey(raw: string): string | null {
  if (raw.trim().startsWith('{') || raw.trim().startsWith('[')) return null
  const value = raw.trim()
  return value.length > 0 && value.length <= 8192 && !/\s/.test(value) ? value : null
}

function validateS3(raw: string): string | null {
  const value = parseObject(raw)
  if (!value || 'providerKey' in value || 'apiKey' in value) return null
  const { accessKeyId, secretAccessKey, bucket, region, endpoint } = value
  if (typeof accessKeyId !== 'string' || accessKeyId.trim().length === 0) return null
  if (typeof secretAccessKey !== 'string' || secretAccessKey.trim().length === 0) return null
  if (bucket !== undefined && (typeof bucket !== 'string' || !S3_BUCKET_PATTERN.test(bucket.trim()))) return null
  if (region !== undefined && (typeof region !== 'string' || !S3_REGION_PATTERN.test(region.trim()))) return null
  if (endpoint !== undefined && (typeof endpoint !== 'string' || !isHttpUrl(endpoint.trim()))) return null

  return JSON.stringify({
    accessKeyId: accessKeyId.trim(),
    secretAccessKey: secretAccessKey.trim(),
    ...(typeof bucket === 'string' ? { bucket: bucket.trim() } : {}),
    ...(typeof region === 'string' ? { region: region.trim() } : {}),
    ...(typeof endpoint === 'string' ? { endpoint: endpoint.trim() } : {}),
  })
}

function parseS3Config(stored: string | null): S3Config | null {
  const value = stored ? parseObject(stored) : null
  if (!value) return null
  const { accessKeyId, secretAccessKey, bucket, region, endpoint } = value
  if (typeof accessKeyId !== 'string' || typeof secretAccessKey !== 'string') return null
  if (typeof bucket !== 'string' || !S3_BUCKET_PATTERN.test(bucket)) return null
  if (typeof region !== 'string' || !S3_REGION_PATTERN.test(region)) return null
  if (endpoint !== undefined && (typeof endpoint !== 'string' || !isHttpUrl(endpoint))) return null
  return { accessKeyId, secretAccessKey, bucket, region, ...(endpoint ? { endpoint } : {}) }
}

function emptySettings(): SettingsSnapshot {
  return {
    apiKey: '',
    s3: { accessKeyId: '', secretAccessKey: '', bucket: '', region: '', endpoint: '' },
  }
}

const SETTINGS_STORAGE_KEY = 'settingsToml'
// All instances share the queue: a read cannot race a read/modify/write commit.
let settingsQueue: Promise<unknown> = Promise.resolve()

function serialized<T>(operation: () => Promise<T>): Promise<T> {
  const next = settingsQueue.catch(() => undefined).then(operation)
  settingsQueue = next
  return next
}

function storedSnapshot(raw: string): SettingsSnapshot {
  try {
    const value = parseSettingsToml(raw)
    const s3 = value.s3
    if (typeof value.apiKey !== 'string' || !s3 || typeof s3 !== 'object' || Array.isArray(s3)) throw new Error()
    const fields = s3 as Record<string, unknown>
    const snapshot = emptySettings()
    snapshot.apiKey = value.apiKey
    for (const key of Object.keys(snapshot.s3) as Array<keyof SettingsSnapshot['s3']>) {
      if (typeof fields[key] !== 'string') throw new Error()
      snapshot.s3[key] = fields[key]
    }
    return snapshot
  } catch {
    // Never include parser source excerpts or credential values in diagnostics.
    throw new Error('Protected settings could not be loaded.')
  }
}

async function writeSnapshot(snapshot: SettingsSnapshot): Promise<void> {
  await SecureStore.setItemAsync(SETTINGS_STORAGE_KEY, serializeSettingsToml({ ...snapshot }))
}

async function readSnapshot(): Promise<SettingsSnapshot> {
  const current = await SecureStore.getItemAsync(SETTINGS_STORAGE_KEY)
  if (current !== null) return storedSnapshot(current)
  const [apiKey, s3] = await Promise.all([
    SecureStore.getItemAsync(PROVIDER_KEY_STORAGE_KEY),
    SecureStore.getItemAsync(S3_STORAGE_KEY),
  ])
  const snapshot = emptySettings()
  snapshot.apiKey = apiKey ?? '' // Migration must preserve the raw API key exactly.
  if (s3 !== null) {
    const legacy = parseObject(s3)
    if (!legacy) throw new Error('Protected legacy settings could not be loaded.')
    for (const key of Object.keys(snapshot.s3) as Array<keyof SettingsSnapshot['s3']>) {
      if (legacy[key] !== undefined && typeof legacy[key] !== 'string')
        throw new Error('Protected legacy settings could not be loaded.')
      snapshot.s3[key] = typeof legacy[key] === 'string' ? legacy[key] : ''
    }
  }
  try {
    await writeSnapshot(snapshot)
  } catch {
    // Legacy records remain authoritative and recoverable; the next read retries.
  }
  return snapshot
}

function snapshotConfig(snapshot: SettingsSnapshot): S3Config | null {
  const config = snapshot.s3
  if (!config.accessKeyId || !config.secretAccessKey) return null
  return parseS3Config(
    JSON.stringify({
      ...config,
      endpoint: config.endpoint || undefined,
    }),
  )
}

export function createSecretService(): SecretService {
  async function commitSettings(apiKey: string, s3?: S3Config | null): Promise<void> {
    await serialized(async () => {
      const snapshot = await readSnapshot()
      snapshot.apiKey = apiKey
      if (s3 !== undefined) snapshot.s3 = s3 === null ? emptySettings().s3 : { ...s3, endpoint: s3.endpoint ?? '' }
      await writeSnapshot(snapshot)
    })
  }

  async function importSecret(kind: SecretKind): Promise<SecretResult> {
    const picker = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false })
    if (picker.canceled) return { ok: false, code: 'chooser-cancelled' }
    const asset = picker.assets[0]
    if (!asset) return { ok: false, code: 'unknown' }
    try {
      let raw: string
      try {
        raw = await FileSystem.readAsStringAsync(asset.uri)
      } finally {
        if (FileSystem.cacheDirectory && asset.uri.startsWith(`${FileSystem.cacheDirectory}DocumentPicker/`)) {
          await FileSystem.deleteAsync(asset.uri, { idempotent: true })
        }
      }
      const normalized = kind === 'provider-key' ? validateProviderKey(raw) : validateS3(raw)
      if (!normalized) return invalid()
      await serialized(async () => {
        const snapshot = await readSnapshot()
        if (kind === 'provider-key') snapshot.apiKey = normalized
        else snapshot.s3 = { ...emptySettings().s3, ...JSON.parse(normalized) }
        await writeSnapshot(snapshot)
      })
      return { ok: true }
    } catch {
      return { ok: false, code: 'unknown' }
    }
  }

  return {
    async hasProviderKey() {
      return (await serialized(readSnapshot)).apiKey !== ''
    },
    import: importSecret,
    async getProviderKey() {
      return (await serialized(readSnapshot)).apiKey || null
    },
    async getS3Config() {
      return snapshotConfig(await serialized(readSnapshot))
    },
    readSettings() {
      return serialized(readSnapshot)
    },
    commitSettings,
    async saveApiKey(value) {
      await commitSettings(value)
    },
    async saveS3Config(config) {
      await serialized(async () => {
        const snapshot = await readSnapshot()
        snapshot.s3 = config === null ? emptySettings().s3 : { ...config, endpoint: config.endpoint ?? '' }
        await writeSnapshot(snapshot)
      })
    },
  }
}
