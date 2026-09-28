import { DEFAULT_PROVIDER_ENDPOINT, normalizeProviderEndpoint } from '../ai/providerEndpoint'
import type { SettingsSnapshot } from '../secrets/secretService'
import type { Conversation } from '../storage/schema'
import { DEFAULT_MODEL, enabledModels } from '../settings/modelPreferences'

export interface ModelSelection {
  id: string
  endpoint: string
}

export function validSelection(
  selection: ModelSelection | null,
  settings: SettingsSnapshot,
): selection is ModelSelection {
  return (
    selection !== null &&
    selection.endpoint === normalizeProviderEndpoint(settings.endpoint) &&
    enabledModels(settings).includes(selection.id)
  )
}

export function initialSelection(settings: SettingsSnapshot): ModelSelection | null {
  const ids = enabledModels(settings)
  return ids.length === 1 ? { id: ids[0]!, endpoint: normalizeProviderEndpoint(settings.endpoint) } : null
}

export function restoreSelection(conversation: Conversation, settings: SettingsSnapshot): ModelSelection | null {
  const provenance = conversation.selectionProvenance
  // A malformed/present provenance must never fall through to the legacy exception.
  const endpoint = provenance
    ? provenance.endpoint
    : conversation.model === DEFAULT_MODEL
      ? DEFAULT_PROVIDER_ENDPOINT
      : null
  if (typeof endpoint !== 'string') return null
  let normalized: string
  try {
    normalized = normalizeProviderEndpoint(endpoint)
  } catch {
    return null
  }
  if (normalized !== endpoint) return null
  const selection = { id: conversation.model, endpoint }
  return validSelection(selection, settings) ? selection : null
}
