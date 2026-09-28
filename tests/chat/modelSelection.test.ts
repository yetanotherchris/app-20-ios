import { describe, expect, it } from 'vitest'
import { initialSelection, restoreSelection, validSelection } from '../../src/chat/modelSelection'
import { DEFAULT_PROVIDER_ENDPOINT } from '../../src/ai/providerEndpoint'
import { enabledModels, withEnabledModels } from '../../src/settings/modelPreferences'
import type { SettingsSnapshot } from '../../src/secrets/secretService'
import type { Conversation } from '../../src/storage/schema'
const settings: SettingsSnapshot = {
  apiKey: '',
  s3: { bucket: '', region: '', accessKeyId: '', secretAccessKey: '', endpoint: '' },
}
const conversation: Conversation = {
  id: 'c',
  title: 'kept',
  model: 'openrouter/auto',
  createdAt: '',
  updatedAt: '',
  messages: [],
}

describe('endpoint scoped selections', () => {
  it('defaults fresh/upgraded OpenRouter but respects an explicit empty list forever', () => {
    expect(initialSelection(settings)?.id).toBe('openrouter/auto')
    expect(initialSelection(withEnabledModels(settings, []))).toBeNull()
    expect(initialSelection({ ...settings, endpoint: 'https://other.example/v1' })).toBeNull()
    expect(initialSelection(withEnabledModels(settings, ['a', 'b']))).toBeNull()
    expect(
      initialSelection(withEnabledModels({ ...settings, endpoint: 'https://other.example/v1' }, ['sole']))?.id,
    ).toBe('sole')
  })
  it('isolates lists and requires explicit selection for identical foreign identifiers', () => {
    const first = withEnabledModels(settings, ['same'])
    const second = withEnabledModels({ ...first, endpoint: 'https://other.example/v1/' }, ['same'])
    const saved = { ...conversation, model: 'same', selectionProvenance: { endpoint: DEFAULT_PROVIDER_ENDPOINT } }
    expect(restoreSelection(saved, first)?.id).toBe('same')
    expect(restoreSelection(saved, second)).toBeNull()
    expect(enabledModels({ ...second, endpoint: DEFAULT_PROVIDER_ENDPOINT })).toEqual(['same'])
    expect(validSelection({ id: 'same', endpoint: DEFAULT_PROVIDER_ENDPOINT }, second)).toBe(false)
  })
  it('restores only the enabled legacy OpenRouter auto exception', () => {
    expect(restoreSelection(conversation, settings)?.endpoint).toBe(DEFAULT_PROVIDER_ENDPOINT)
    expect(restoreSelection(conversation, withEnabledModels(settings, []))).toBeNull()
    expect(restoreSelection(conversation, { ...settings, endpoint: 'https://other.example/v1' })).toBeNull()
    expect(restoreSelection({ ...conversation, model: 'other' }, withEnabledModels(settings, ['other']))).toBeNull()
    expect(restoreSelection({ ...conversation, model: '' }, settings)).toBeNull()
    expect(restoreSelection({ ...conversation, selectionProvenance: {} }, settings)).toBeNull()
  })
})
