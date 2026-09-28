import { describe, expect, it } from 'vitest'
import { validateSettings, mergeSettingsPatch } from '../../src/settings/settingsValidation'

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

it('assigns imported lists to the document endpoint and keeps unrelated endpoint choices', () => {
  const current = { ...empty, endpoint: 'https://a.example/v1', modelPreferences: { 'https://a.example/v1': ['old'] } }
  const next = mergeSettingsPatch(current, { endpoint: 'https://b.example/prefix/v1/', enabledModels: ['exact'] })
  expect(next.endpoint).toBe('https://b.example/prefix/v1')
  expect(next.modelPreferences).toEqual({ 'https://a.example/v1': ['old'], 'https://b.example/prefix/v1': ['exact'] })
  expect(mergeSettingsPatch(current, { enabledModels: [] }).modelPreferences?.['https://a.example/v1']).toEqual([])
  expect(
    mergeSettingsPatch(current, { endpoint: '', enabledModels: ['auto'] }).modelPreferences?.[
      'https://openrouter.ai/api/v1'
    ],
  ).toEqual(['auto'])
})
