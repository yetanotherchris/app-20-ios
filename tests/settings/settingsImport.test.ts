import { describe, expect, it } from 'vitest'
import { decodeSettingsFile, parseSettingsImport } from '../../src/settings/settingsImport'

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
      error: 'The file contains a duplicate setting.',
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
      error: 'The file contains a duplicate setting.',
    })
  })

  it('rejects a duplicate empty-string property name (FR-014)', () => {
    const result = parseSettingsImport('settings.json', '{"":1,"":2}')
    expect(result).toEqual({
      ok: false,
      error: 'The file contains a duplicate setting.',
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

describe('TOML settings', () => {
  it('accepts BOM, comments, literal strings and dotted keys', () => {
    expect(
      parseSettingsImport('settings.toml', '\uFEFF# comment\napiKey = "new-key"\ns3.bucket = \'my-bucket\''),
    ).toEqual({
      ok: true,
      patch: { apiKey: 'new-key', s3: { bucket: 'my-bucket' } },
    })
  })
  it.each([
    '# only comments',
    'apiKey = "one"\napiKey = "two"',
    '[s3]\n[s3]',
    'apiKey = 12',
    'apiKey = true',
    'apiKey = 2026-01-01',
    'apiKey = []',
    'apiKey = {}',
    'unknown = "secret"',
    '[s3]\nunknown = "secret"',
    's3.bucket = "Invalid bucket"',
    'apiKey = "secret',
    'apiKey = "\\e"',
    'apiKey = "\\x41"',
    's3 = { bucket = "my-bucket", }',
    's3 = {\nbucket = "my-bucket"\n}',
  ])('rejects invalid input without echoing it: %s', (raw) => {
    const result = parseSettingsImport('settings.toml', raw)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).not.toContain('secret')
  })
  it('preserves explicit clears and accepts inline S3 tables', () => {
    expect(parseSettingsImport('SETTINGS.TOML', 'apiKey = ""\ns3 = { secretAccessKey = "" }')).toEqual({
      ok: true,
      patch: { apiKey: '', s3: { secretAccessKey: '' } },
    })
  })
})

describe('UTF-8 settings files', () => {
  it.each([[0xc0, 0xaf], [0xe2, 0x82], [0xed, 0xa0, 0x80], [0xf4, 0x90, 0x80, 0x80], [0xff]])(
    'rejects malformed bytes %j',
    (...bytes) => {
      expect(() => decodeSettingsFile(new Uint8Array(bytes))).toThrow('UTF-8')
    },
  )
  it('accepts valid Unicode including replacement characters and BOM', () => {
    const source = '\uFEFFapiKey = "\uFFFD\u{1F600}"'
    expect(decodeSettingsFile(new TextEncoder().encode(source))).toBe(source)
  })
  it('bounds actual bytes and string imports', () => {
    expect(() => decodeSettingsFile(new Uint8Array(1024 * 1024 + 1))).toThrow('1 MiB')
    expect(parseSettingsImport('settings.toml', ' '.repeat(1024 * 1024 + 1)).ok).toBe(false)
  })
})
