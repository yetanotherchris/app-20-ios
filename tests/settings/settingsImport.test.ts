import { describe, expect, it } from 'vitest'
import { parseSettingsImport } from '../../src/settings/settingsImport'

describe('parseSettingsImport', () => {
  it('parses a partial JSON patch without inventing fields', () => {
    expect(parseSettingsImport('settings.json', '{"apiKey":"key","s3":{"bucket":"bucket"}}')).toEqual({
      ok: true,
      patch: { apiKey: 'key', s3: { bucket: 'bucket' } },
    })
  })

  it('rejects duplicate and unknown text settings', () => {
    expect(parseSettingsImport('settings.txt', 'API_KEY=one\nAPI_KEY=two')).toEqual({
      ok: false,
      error: 'The file contains a duplicate setting.',
    })
    expect(parseSettingsImport('settings.txt', 'UNKNOWN=value')).toEqual({
      ok: false,
      error: 'The file contains an unknown setting.',
    })
  })

  it('rejects a duplicate JSON property name (FR-014)', () => {
    expect(
      parseSettingsImport('settings.json', '{"apiKey":"one","apiKey":"two","s3":{"bucket":"weekend-chat-beta"}}'),
    ).toEqual({
      ok: false,
      error: 'The file contains the duplicate setting "apiKey".',
    })
  })

  it('rejects duplicate nested S3 property names (FR-014)', () => {
    const result = parseSettingsImport('settings.json', '{"s3":{"bucket":"weekend-chat-beta","bucket":"other-bucket"}}')
    expect(result.ok).toBe(false)
  })

  it('rejects a duplicate name written with a unicode escape (FR-014)', () => {
    const result = parseSettingsImport('settings.json', '{"apiKey":"one","api\\u004bey":"two"}')
    expect(result).toEqual({
      ok: false,
      error: 'The file contains the duplicate setting "apiKey".',
    })
  })

  it('rejects a duplicate empty-string property name (FR-014)', () => {
    const result = parseSettingsImport('settings.json', '{"":1,"":2}')
    expect(result).toEqual({
      ok: false,
      error: 'The file contains the duplicate setting "".',
    })
  })

  it('rejects an inherited object property name as unknown (FR-014)', () => {
    expect(parseSettingsImport('settings.txt', '__proto__=x')).toEqual({
      ok: false,
      error: 'The file contains an unknown setting.',
    })
    expect(parseSettingsImport('settings.txt', 'constructor=x')).toEqual({
      ok: false,
      error: 'The file contains an unknown setting.',
    })
  })

  it('rejects an invalid provided bucket or region (FR-013)', () => {
    expect(parseSettingsImport('settings.json', '{"s3":{"bucket":"BAD BUCKET"}}')).toEqual({
      ok: false,
      error: 'The bucket name is not valid.',
    })
    expect(parseSettingsImport('settings.json', '{"s3":{"region":"EU W1"}}')).toEqual({
      ok: false,
      error: 'The region is not valid.',
    })
  })

  it('rejects a non-HTTPS endpoint (FR-013)', () => {
    expect(parseSettingsImport('settings.json', '{"s3":{"endpoint":"http://example.com"}}')).toEqual({
      ok: false,
      error: 'The endpoint must be an absolute HTTPS URL.',
    })
  })

  it('accepts an explicitly empty provided value as a clear', () => {
    expect(parseSettingsImport('settings.json', '{"apiKey":""}')).toEqual({
      ok: true,
      patch: { apiKey: '' },
    })
  })

  it('accepts a syntactically valid partial S3 group', () => {
    expect(parseSettingsImport('settings.json', '{"s3":{"bucket":"weekend-chat-beta"}}')).toEqual({
      ok: true,
      patch: { s3: { bucket: 'weekend-chat-beta' } },
    })
  })
})
