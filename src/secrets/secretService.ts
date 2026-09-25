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

export function createSecretService(): SecretService {
  async function importSecret(kind: SecretKind): Promise<SecretResult> {
    const picker = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
    })
    if (picker.canceled) return { ok: false, code: 'chooser-cancelled' }
    const asset = picker.assets[0]
    if (!asset) return { ok: false, code: 'unknown' }

    try {
      const raw = await FileSystem.readAsStringAsync(asset.uri)
      const normalized = kind === 'provider-key' ? validateProviderKey(raw) : validateS3(raw)
      if (!normalized) return invalid()
      await SecureStore.setItemAsync(kind === 'provider-key' ? PROVIDER_KEY_STORAGE_KEY : S3_STORAGE_KEY, normalized)
      return { ok: true }
    } catch {
      return { ok: false, code: 'unknown' }
    }
  }

  return {
    async hasProviderKey() {
      return (await SecureStore.getItemAsync(PROVIDER_KEY_STORAGE_KEY)) !== null
    },
    import: importSecret,
    async getProviderKey() {
      return SecureStore.getItemAsync(PROVIDER_KEY_STORAGE_KEY)
    },
    async getS3Config() {
      return parseS3Config(await SecureStore.getItemAsync(S3_STORAGE_KEY))
    },
    async readSettings() {
      const [apiKey, s3] = await Promise.all([
        SecureStore.getItemAsync(PROVIDER_KEY_STORAGE_KEY),
        SecureStore.getItemAsync(S3_STORAGE_KEY),
      ])
      const snapshot = emptySettings()
      snapshot.apiKey = apiKey ?? ''
      const config = parseS3Config(s3)
      if (config) {
        snapshot.s3 = {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
          bucket: config.bucket,
          region: config.region,
          endpoint: config.endpoint ?? '',
        }
      }
      return snapshot
    },
    async saveApiKey(value) {
      if (value === '') await SecureStore.deleteItemAsync(PROVIDER_KEY_STORAGE_KEY)
      else await SecureStore.setItemAsync(PROVIDER_KEY_STORAGE_KEY, value)
    },
    async saveS3Config(config) {
      if (config === null) await SecureStore.deleteItemAsync(S3_STORAGE_KEY)
      else await SecureStore.setItemAsync(S3_STORAGE_KEY, JSON.stringify(config))
    },
  }
}
