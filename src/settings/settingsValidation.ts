import type { S3Config, SettingsSnapshot } from '../secrets/secretService'
import type { SettingsPatch } from './settingsImport'

export type SettingsField = 'apiKey' | 'bucket' | 'region' | 'accessKeyId' | 'secretAccessKey' | 'endpoint'

export type SettingsErrors = Partial<Record<SettingsField, string>>

export interface ValidatedSettings {
  apiKey: string
  s3: S3Config | null
}

export function mergeSettingsPatch(snapshot: SettingsSnapshot, patch: SettingsPatch): SettingsSnapshot {
  return {
    apiKey: patch.apiKey ?? snapshot.apiKey,
    s3: { ...snapshot.s3, ...patch.s3 },
  }
}

function trimSettings(snapshot: SettingsSnapshot): SettingsSnapshot {
  return {
    apiKey: snapshot.apiKey.trim(),
    s3: {
      bucket: snapshot.s3.bucket.trim(),
      region: snapshot.s3.region.trim(),
      accessKeyId: snapshot.s3.accessKeyId.trim(),
      secretAccessKey: snapshot.s3.secretAccessKey.trim(),
      endpoint: snapshot.s3.endpoint.trim(),
    },
  }
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

export function validateSettings(snapshot: SettingsSnapshot): {
  errors: SettingsErrors
  value: ValidatedSettings | null
} {
  const value = trimSettings(snapshot)
  const s3Values = Object.values(value.s3)
  if (s3Values.every((entry) => entry === '')) return { errors: {}, value: { apiKey: value.apiKey, s3: null } }

  const errors: SettingsErrors = {}
  if (value.s3.bucket === '') errors.bucket = 'Enter a bucket.'
  if (value.s3.region === '') errors.region = 'Enter a region.'
  if (value.s3.accessKeyId === '') errors.accessKeyId = 'Enter an access key ID.'
  if (value.s3.secretAccessKey === '') errors.secretAccessKey = 'Enter a secret access key.'
  if (value.s3.endpoint !== '' && !isHttpsUrl(value.s3.endpoint)) {
    errors.endpoint = 'Use an absolute HTTPS URL.'
  }
  if (Object.keys(errors).length > 0) return { errors, value: null }

  return {
    errors: {},
    value: {
      apiKey: value.apiKey,
      s3: {
        bucket: value.s3.bucket,
        region: value.s3.region,
        accessKeyId: value.s3.accessKeyId,
        secretAccessKey: value.s3.secretAccessKey,
        ...(value.s3.endpoint === '' ? {} : { endpoint: value.s3.endpoint }),
      },
    },
  }
}
