import { useEffect, useState } from 'react'
import { ActivityIndicator, FlatList, Modal, Pressable, Switch, Text, TextInput, View } from 'react-native'
import type { SettingsSnapshot } from '../secrets/secretService'
import { normalizeProviderEndpoint } from '../ai/providerEndpoint'
import { catalogCache, loadModelCatalog, searchModels, type CatalogModel } from './modelCatalog'
import { enabledModels, withEnabledModels } from './modelPreferences'

interface Props {
  saved: SettingsSnapshot | null
  draft: SettingsSnapshot
  visible: boolean
  disabled: boolean
  onChange(settings: SettingsSnapshot): void
}

export function ModelCatalog({ saved, draft, visible, disabled, onChange }: Props): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [retained, setRetained] = useState<Record<string, readonly string[]>>({})
  const [query, setQuery] = useState('')
  const [manual, setManual] = useState('')
  const [models, setModels] = useState<readonly CatalogModel[]>([])
  const [state, setState] = useState<'loading' | 'complete' | 'error'>('loading')
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const endpoint = saved ? normalizeProviderEndpoint(saved.endpoint) : null
  const apiKey = saved?.apiKey ?? ''
  useEffect(() => {
    if (!visible || !open || !endpoint) return
    const controller = new AbortController()
    setModels(catalogCache.get(endpoint) ?? [])
    setState('loading')
    setError('')
    void loadModelCatalog(endpoint, apiKey, controller.signal)
      .then((catalog) => {
        if (!controller.signal.aborted) {
          setModels(catalog)
          setState('complete')
        }
      })
      .catch((failure: unknown) => {
        if (controller.signal.aborted) return
        setState('error')
        setError(
          failure instanceof Error && /^(The |Model )/.test(failure.message)
            ? failure.message
            : 'Model discovery failed. Retry or add a model manually.',
        )
      })
    return () => controller.abort()
  }, [endpoint, apiKey, refresh, visible, open])

  let activeEndpoint: string | null = null
  try {
    activeEndpoint = normalizeProviderEndpoint(draft.endpoint)
  } catch {
    /* Invalid drafts leave saved discovery isolated. */
  }
  const editable = !disabled && endpoint !== null && endpoint === activeEndpoint
  const selected = activeEndpoint ? enabledModels(draft) : []
  const known = new Set(models.map((model) => model.id))
  const unlisted = [...new Set([...selected, ...(endpoint ? (retained[endpoint] ?? []) : [])])].filter(
    (id) => !known.has(id),
  )
  const rows = [...models, ...unlisted.map((id) => ({ id, name: id }))]
  const matches = searchModels(rows, query)

  function toggle(id: string): void {
    if (!editable) return
    if (endpoint && !known.has(id)) {
      setRetained((previous) => ({ ...previous, [endpoint]: [...new Set([...(previous[endpoint] ?? []), id])] }))
    }
    onChange(
      withEnabledModels(draft, selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id]),
    )
  }

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Manage models"
        disabled={disabled}
        onPress={() => setOpen(true)}
      >
        <Text>Manage models</Text>
      </Pressable>
      <Modal visible={visible && open} presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, padding: 24, gap: 10 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close model settings"
            onPress={() => setOpen(false)}
          >
            <Text>Done</Text>
          </Pressable>
          <Text style={{ fontSize: 20, fontWeight: '600' }}>Models</Text>
          <Text>Discovery uses the saved API base URL. A listed model may not support chat.</Text>
          {!editable && !disabled ? <Text>Save a valid API base URL before changing models.</Text> : null}
          <TextInput
            accessibilityLabel="Search models"
            placeholder="Search model name or identifier"
            value={query}
            onChangeText={setQuery}
          />
          {state === 'loading' ? (
            <View>
              <ActivityIndicator />
              <Text>Loading model catalog…</Text>
            </View>
          ) : null}
          {state === 'error' ? <Text accessibilityRole="alert">{error}</Text> : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={state === 'error' ? 'Retry model catalog' : 'Refresh model catalog'}
            onPress={() => setRefresh((value) => value + 1)}
          >
            <Text>{state === 'error' ? 'Retry model catalog' : 'Refresh model catalog'}</Text>
          </Pressable>
          {state === 'complete' && models.length === 0 ? <Text>The provider returned an empty catalog.</Text> : null}
          {query && matches.length === 0 ? <Text>No models match your search.</Text> : null}
          {!selected.length ? <Text>No enabled models. Enable a model here to send messages.</Text> : null}
          <FlatList
            style={{ flex: 1 }}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            data={matches}
            keyExtractor={(model) => model.id}
            renderItem={({ item }) => (
              <View style={{ paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text>{item.name}</Text>
                  <Text>
                    {item.id}
                    {known.has(item.id) ? '' : ' (unlisted)'}
                  </Text>
                </View>
                <Switch
                  accessibilityLabel={`${selected.includes(item.id) ? 'Disable' : 'Enable'} model ${item.id}`}
                  value={selected.includes(item.id)}
                  disabled={!editable}
                  onValueChange={() => toggle(item.id)}
                />
              </View>
            )}
          />
          <TextInput
            accessibilityLabel="Exact model identifier"
            placeholder="Exact model identifier"
            value={manual}
            onChangeText={setManual}
            editable={editable}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add model"
            disabled={!editable || !manual.trim()}
            accessibilityState={{ disabled: !editable || !manual.trim() }}
            onPress={() => {
              if (!selected.includes(manual)) onChange(withEnabledModels(draft, [...selected, manual]))
              setManual('')
            }}
          >
            <Text>Add and enable model</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  )
}
