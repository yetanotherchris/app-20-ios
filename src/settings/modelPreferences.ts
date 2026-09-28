import { DEFAULT_PROVIDER_ENDPOINT, normalizeProviderEndpoint } from '../ai/providerEndpoint'
import type { SettingsSnapshot } from '../secrets/secretService'

export const DEFAULT_MODEL = 'openrouter/auto'

export function validateModelIdentifiers(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((id) => typeof id === 'string' && id.trim().length > 0) &&
    new Set(value).size === value.length
  )
}

export function enabledModels(settings: Pick<SettingsSnapshot, 'endpoint' | 'modelPreferences'>): readonly string[] {
  const endpoint = normalizeProviderEndpoint(settings.endpoint)
  if (Object.hasOwn(settings.modelPreferences ?? {}, endpoint)) return settings.modelPreferences![endpoint]!
  return endpoint === DEFAULT_PROVIDER_ENDPOINT ? [DEFAULT_MODEL] : []
}

export function withEnabledModels(settings: SettingsSnapshot, identifiers: readonly string[]): SettingsSnapshot {
  const endpoint = normalizeProviderEndpoint(settings.endpoint)
  return { ...settings, modelPreferences: { ...settings.modelPreferences, [endpoint]: [...identifiers] } }
}
