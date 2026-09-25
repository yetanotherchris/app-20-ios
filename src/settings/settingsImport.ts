import type { SettingsSnapshot } from '../secrets/secretService'

export interface SettingsPatch {
  apiKey?: string
  s3?: Partial<SettingsSnapshot['s3']>
}

export type SettingsImportResult = { ok: true; patch: SettingsPatch } | { ok: false; error: string }

const MAX_BYTES = 1024 * 1024
const MAX_JSON_DEPTH = 64
const S3_BUCKET_PATTERN = /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/
const S3_REGION_PATTERN = /^[a-z0-9-]+$/
const TEXT_KEYS: Record<string, keyof SettingsSnapshot['s3'] | 'apiKey'> = Object.assign(
  Object.create(null) as Record<string, keyof SettingsSnapshot['s3'] | 'apiKey'>,
  {
    API_KEY: 'apiKey',
    S3_BUCKET: 'bucket',
    S3_REGION: 'region',
    S3_ACCESS_KEY_ID: 'accessKeyId',
    S3_SECRET_ACCESS_KEY: 'secretAccessKey',
    S3_ENDPOINT: 'endpoint',
  },
)

function invalid(error: string): SettingsImportResult {
  return { ok: false, error }
}

/** Decodes one JSON string character starting at `index`, advancing it past the escape. */
function readJsonChar(raw: string, index: number): { value: string; next: number } {
  const char = raw[index]!
  if (char !== '\\') return { value: char, next: index + 1 }
  const escape = raw[index + 1]
  switch (escape) {
    case 'u': {
      const hex = raw.slice(index + 2, index + 6)
      if (/^[0-9a-fA-F]{4}$/.test(hex)) {
        return { value: String.fromCharCode(parseInt(hex, 16)), next: index + 6 }
      }
      return { value: 'u', next: index + 2 }
    }
    case 'n':
      return { value: '\n', next: index + 2 }
    case 't':
      return { value: '\t', next: index + 2 }
    case 'r':
      return { value: '\r', next: index + 2 }
    case 'b':
      return { value: '\b', next: index + 2 }
    case 'f':
      return { value: '\f', next: index + 2 }
    default:
      return { value: escape ?? '', next: index + 2 }
  }
}

/**
 * JSON.parse keeps the last value for a duplicate name, so a duplicate key must
 * be detected before parsing. This scans string-by-string, decodes escapes so
 * `\u0061piKey` matches `apiKey`, tracks object depth, and returns the duplicate
 * property name or null (FR-014).
 */
function findDuplicateJsonName(raw: string): string | null {
  let index = 0
  const stack: Array<Set<string>> = []
  while (index < raw.length) {
    const char = raw[index]
    if (char === '"') {
      index += 1
      let value = ''
      while (index < raw.length && raw[index] !== '"') {
        const read = readJsonChar(raw, index)
        value += read.value
        index = read.next
      }
      index += 1
      let lookahead = index
      while (lookahead < raw.length && /\s/.test(raw[lookahead]!)) lookahead += 1
      if (raw[lookahead] === ':' && stack.length > 0) {
        const names = stack[stack.length - 1]!
        if (names.has(value)) return value
        names.add(value)
      }
      continue
    }
    if (char === '{') {
      if (stack.length >= MAX_JSON_DEPTH) return null
      stack.push(new Set())
    } else if (char === '}') {
      stack.pop()
    }
    index += 1
  }
  return null
}

function validEndpoint(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

/** Rejects a provided value that could not survive Settings validation (FR-013). */
function invalidProvidedValue(s3: Partial<SettingsSnapshot['s3']>): string | null {
  if (s3.bucket !== undefined && s3.bucket !== '' && !S3_BUCKET_PATTERN.test(s3.bucket.trim())) {
    return 'The bucket name is not valid.'
  }
  if (s3.region !== undefined && s3.region !== '' && !S3_REGION_PATTERN.test(s3.region.trim())) {
    return 'The region is not valid.'
  }
  if (s3.endpoint !== undefined && s3.endpoint !== '' && !validEndpoint(s3.endpoint.trim())) {
    return 'The endpoint must be an absolute HTTPS URL.'
  }
  return null
}

function parseJson(raw: string): SettingsImportResult {
  const duplicate = findDuplicateJsonName(raw)
  if (duplicate !== null) return invalid(`The file contains the duplicate setting "${duplicate}".`)
  try {
    const value: unknown = JSON.parse(raw)
    if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid('Use a JSON settings object.')
    const record = value as Record<string, unknown>
    if (Object.keys(record).some((key) => key !== 'apiKey' && key !== 's3'))
      return invalid('The file contains an unknown setting.')
    if (record.apiKey !== undefined && typeof record.apiKey !== 'string') return invalid('API key must be text.')
    if (record.s3 !== undefined && (!record.s3 || typeof record.s3 !== 'object' || Array.isArray(record.s3))) {
      return invalid('S3 settings must be an object.')
    }
    const s3 = record.s3 as Record<string, unknown> | undefined
    if (
      s3 &&
      Object.keys(s3).some((key) => !['bucket', 'region', 'accessKeyId', 'secretAccessKey', 'endpoint'].includes(key))
    ) {
      return invalid('The file contains an unknown S3 setting.')
    }
    if (s3 && Object.values(s3).some((entry) => typeof entry !== 'string')) return invalid('S3 settings must be text.')
    const s3Patch: Partial<SettingsSnapshot['s3']> = {}
    if (s3) {
      for (const key of ['bucket', 'region', 'accessKeyId', 'secretAccessKey', 'endpoint'] as const) {
        if (typeof s3[key] === 'string') s3Patch[key] = s3[key]
      }
    }
    const invalidValue = invalidProvidedValue(s3Patch)
    if (invalidValue) return invalid(invalidValue)
    return {
      ok: true,
      patch: {
        ...(typeof record.apiKey === 'string' ? { apiKey: record.apiKey } : {}),
        ...(s3 ? { s3: s3Patch } : {}),
      },
    }
  } catch {
    return invalid('The JSON file could not be read.')
  }
}

function parseText(raw: string): SettingsImportResult {
  const lines = raw.split(/\r?\n/).filter((line) => line.trim() !== '')
  if (lines.length === 1 && !lines[0]!.includes('=')) return { ok: true, patch: { apiKey: lines[0]! } }

  const seen = new Set<string>()
  const patch: Partial<SettingsSnapshot['s3']> = {}
  let apiKey: string | undefined
  for (const line of lines) {
    const separator = line.indexOf('=')
    if (separator < 1) return invalid('Use KEY=value lines.')
    const name = line.slice(0, separator).trim()
    const value = line.slice(separator + 1)
    if (seen.has(name)) return invalid('The file contains a duplicate setting.')
    seen.add(name)
    const key = TEXT_KEYS[name]
    if (key === undefined) return invalid('The file contains an unknown setting.')
    if (key === 'apiKey') apiKey = value
    else patch[key] = value
  }
  const invalidValue = invalidProvidedValue(patch)
  if (invalidValue) return invalid(invalidValue)
  return {
    ok: true,
    patch: {
      ...(apiKey === undefined ? {} : { apiKey }),
      ...(Object.keys(patch).length ? { s3: patch } : {}),
    },
  }
}

export function parseSettingsImport(name: string, raw: string): SettingsImportResult {
  if (new TextEncoder().encode(raw).byteLength > MAX_BYTES) return invalid('The selected file is larger than 1 MiB.')
  const content = raw.replace(/^\uFEFF/, '')
  if (content.trim() === '') return invalid('The selected file is empty.')
  if (name.toLowerCase().endsWith('.json')) return parseJson(content)
  if (name.toLowerCase().endsWith('.txt')) return parseText(content)
  return invalid('Choose a JSON or text settings file.')
}
