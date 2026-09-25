import { describe, expect, it } from 'vitest'
import { validateSettings } from '../../src/settings/settingsValidation'

const empty = {
  apiKey: '',
  s3: { bucket: '', region: '', accessKeyId: '', secretAccessKey: '', endpoint: '' },
}

describe('validateSettings', () => {
  it('accepts local-only settings', () => {
    expect(validateSettings({ ...empty, apiKey: ' key ' })).toEqual({
      errors: {},
      value: { apiKey: 'key', s3: null },
    })
  })

  it('retains a partial S3 group as validation errors', () => {
    const result = validateSettings({ ...empty, s3: { ...empty.s3, bucket: 'bucket' } })

    expect(result.value).toBeNull()
    expect(result.errors).toMatchObject({
      region: 'Enter a region.',
      accessKeyId: 'Enter an access key ID.',
      secretAccessKey: 'Enter a secret access key.',
    })
  })

  it('requires an HTTPS endpoint when supplied', () => {
    const result = validateSettings({
      ...empty,
      s3: {
        bucket: 'bucket',
        region: 'eu-west-1',
        accessKeyId: 'access',
        secretAccessKey: 'secret',
        endpoint: 'http://example.test',
      },
    })

    expect(result).toEqual({ errors: { endpoint: 'Use an absolute HTTPS URL.' }, value: null })
  })
})
