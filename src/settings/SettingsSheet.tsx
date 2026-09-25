import { useEffect, useEffectEvent, useRef, useState } from 'react'
import {
  ActivityIndicator,
  AppState,
  findNodeHandle,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system/legacy'
import type { SecretService, SettingsSnapshot } from '../secrets/secretService'
import { parseSettingsImport } from './settingsImport'
import { createSettingsOperations } from './settingsOperations'
import { mergeSettingsPatch, validateSettings, type SettingsErrors } from './settingsValidation'
import type { SettingsField } from './settingsValidation'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface SettingsSheetProps {
  visible: boolean
  service: SecretService
  onClose(): void
  onSaved(): void
}

const EMPTY_SETTINGS: SettingsSnapshot = {
  apiKey: '',
  s3: { accessKeyId: '', secretAccessKey: '', bucket: '', region: '', endpoint: '' },
}

function fieldError(errors: SettingsErrors, field: keyof SettingsErrors): React.JSX.Element | null {
  return errors[field] ? <Text style={styles.error}>{errors[field]}</Text> : null
}

export function SettingsSheet({ visible, service, onClose, onSaved }: SettingsSheetProps): React.JSX.Element {
  const [draft, setDraft] = useState<SettingsSnapshot>(EMPTY_SETTINGS)
  const [errors, setErrors] = useState<SettingsErrors>({})
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [hydrating, setHydrating] = useState(true)
  const [revealed, setRevealed] = useState<'apiKey' | 'secretAccessKey' | null>(null)
  const latestDraft = useRef(draft)
  const saving = useRef<Promise<void> | null>(null)
  const hydrated = useRef(false)
  const operationsRef = useRef(createSettingsOperations())
  const scrollRef = useRef<ScrollView>(null)
  const fieldRefs = useRef<Partial<Record<SettingsField, View | null>>>({})

  const save = useEffectEvent(async (value: SettingsSnapshot): Promise<boolean> => {
    const result = validateSettings(value)
    setErrors(result.errors)
    setStatus('saving')
    const operation = async (): Promise<void> => {
      // API-key persistence is independent from an incomplete optional S3 form.
      await service.saveApiKey(value.apiKey.trim())
      if (result.value) await service.saveS3Config(result.value.s3)
    }
    const previous = saving.current ?? Promise.resolve()
    // A failed write must not block a later chained write (FR-009).
    const next = previous.catch(() => undefined).then(operation)
    saving.current = next
    try {
      await next
      if (latestDraft.current === value) {
        if (result.value) {
          setStatus('saved')
        } else {
          setStatus('idle')
        }
      }
      onSaved()
      return true
    } catch {
      setStatus('error')
      return false
    } finally {
      if (saving.current === next) saving.current = null
    }
  })

  const scheduleSave = useEffectEvent((value: SettingsSnapshot) => {
    operationsRef.current.schedule(() => void save(value))
  })

  useEffect(() => {
    if (!visible) {
      setRevealed(null)
      operationsRef.current.cancelScheduledSave()
    }
  }, [visible])

  useEffect(() => {
    // Hydrate from protected storage once. A reopen resumes the retained draft
    // instead of discarding an unsaved or failed write (FR-009).
    if (hydrated.current) return
    hydrated.current = true
    let cancelled = false
    setHydrating(true)
    void service
      .readSettings()
      .then((value) => {
        if (cancelled) return
        latestDraft.current = value
        setDraft(value)
        setErrors({})
        setStatus('idle')
        setImportStatus(null)
      })
      .catch(() => {
        if (!cancelled) setImportStatus('Settings could not be loaded.')
      })
      .finally(() => {
        if (!cancelled) setHydrating(false)
      })
    return () => {
      cancelled = true
    }
  }, [service])

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      // A revealed secret is masked whenever the app leaves the foreground
      // (FR-012).
      if (state !== 'active') setRevealed(null)
    })
    return () => subscription.remove()
  }, [])

  function update(next: SettingsSnapshot): void {
    if (hydrating || importing) return
    latestDraft.current = next
    setDraft(next)
    setImportStatus(null)
    scheduleSave(next)
  }

  async function importFile(): Promise<void> {
    if (hydrating || !operationsRef.current.beginImport()) return
    setImporting(true)
    try {
      const picker = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: ['application/json', 'text/plain'],
      })
      if (picker.canceled || !picker.assets[0]) return
      const asset = picker.assets[0]
      setImportStatus(`Reading ${asset.name}…`)
      const parsed = parseSettingsImport(asset.name, await FileSystem.readAsStringAsync(asset.uri))
      if (!parsed.ok) {
        setImportStatus(parsed.error)
        return
      }
      setRevealed(null)
      const next = mergeSettingsPatch(latestDraft.current, parsed.patch)
      // A valid partial S3 group remains in the draft until the required
      // fields are supplied. The complete saved group remains unchanged.
      const merged = validateSettings(next)
      latestDraft.current = next
      setDraft(next)
      setErrors(merged.errors)
      if (!merged.value) {
        setImportStatus(`Imported ${asset.name}. Complete S3 Keys to save.`)
        await save(next)
        return
      }
      setImportStatus(`Imported ${asset.name}. Saving…`)
      if (await save(next)) setImportStatus(`Imported ${asset.name}. Saved.`)
    } catch {
      setImportStatus('The selected file could not be read.')
    } finally {
      operationsRef.current.finishImport()
      setImporting(false)
    }
  }

  function focusField(field: SettingsField): void {
    const handle = findNodeHandle(fieldRefs.current[field] ?? null)
    if (handle) scrollRef.current?.scrollResponderScrollNativeHandleToKeyboard(handle, 16, true)
  }

  function close(): void {
    operationsRef.current.cancelScheduledSave()
    if (!hydrating) void save(latestDraft.current)
    setRevealed(null)
    onClose()
  }

  const s3Configured = validateSettings(draft).value?.s3 !== null
  const interactionLocked = hydrating || importing
  return (
    <Modal animationType="slide" onRequestClose={close} presentationStyle="pageSheet" visible={visible}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Pressable
            accessibilityLabel="Close settings"
            accessibilityRole="button"
            onPress={close}
            style={styles.close}
          >
            <Text style={styles.closeText}>×</Text>
          </Pressable>
        </View>
        {hydrating ? (
          <View style={styles.status}>
            <ActivityIndicator size="small" />
            <Text style={styles.statusText}>Loading settings…</Text>
          </View>
        ) : null}
        {status === 'saving' ? (
          <View style={styles.status}>
            <ActivityIndicator size="small" />
            <Text style={styles.statusText}>Saving…</Text>
          </View>
        ) : null}
        {status === 'saved' ? (
          <Text accessibilityRole="alert" style={styles.statusText}>
            Saved
          </Text>
        ) : null}
        {status === 'error' ? (
          <Pressable
            accessibilityLabel="Retry saving settings"
            accessibilityRole="button"
            onPress={() => void save(latestDraft.current)}
            style={styles.retry}
          >
            <Text style={styles.error}>Not saved. Retry</Text>
          </Pressable>
        ) : null}
        <ScrollView
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          ref={scrollRef}
        >
          <Pressable
            accessibilityLabel="Import from JSON file"
            accessibilityRole="button"
            accessibilityState={{ disabled: interactionLocked }}
            disabled={interactionLocked}
            onPress={() => void importFile()}
            style={styles.import}
          >
            <Text style={styles.importText}>Import from JSON file</Text>
          </Pressable>
          {importStatus ? (
            <Text accessibilityRole="alert" style={styles.importStatus}>
              {importStatus}
            </Text>
          ) : null}
          <Text style={styles.section}>API key</Text>
          <View
            ref={(node) => {
              fieldRefs.current.apiKey = node
            }}
            style={styles.card}
          >
            <Text style={styles.label}>API key</Text>
            <View style={styles.secretRow}>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                editable={!interactionLocked}
                onBlur={() => void save(latestDraft.current)}
                onChangeText={(apiKey) => update({ ...draft, apiKey })}
                onFocus={() => focusField('apiKey')}
                onSubmitEditing={() => void save(latestDraft.current)}
                placeholder="Enter API key"
                returnKeyType="done"
                secureTextEntry={revealed !== 'apiKey'}
                style={styles.input}
                value={draft.apiKey}
              />
              <Pressable
                accessibilityLabel={revealed === 'apiKey' ? 'Hide API key' : 'Show API key'}
                accessibilityRole="button"
                accessibilityState={{
                  expanded: revealed === 'apiKey',
                  disabled: draft.apiKey === '',
                }}
                disabled={interactionLocked || draft.apiKey === ''}
                onPress={() => setRevealed((current) => (current === 'apiKey' ? null : 'apiKey'))}
                style={styles.eye}
              >
                <Text>◉</Text>
              </Pressable>
            </View>
            {fieldError(errors, 'apiKey')}
          </View>
          <Text style={styles.section}>S3 Keys</Text>
          <Text style={styles.helper}>
            {s3Configured
              ? 'Chats save on this device and to S3.'
              : 'Optional. Without S3 keys, chats save on this device.'}
          </Text>
          <View style={styles.card}>
            <SettingInput
              disabled={interactionLocked}
              onContainerRef={(node) => {
                fieldRefs.current.bucket = node
              }}
              label="Bucket"
              placeholder="Enter bucket name"
              value={draft.s3.bucket}
              error={errors.bucket}
              onBlur={() => void save(latestDraft.current)}
              onChangeText={(bucket) => update({ ...draft, s3: { ...draft.s3, bucket } })}
              onFocus={() => focusField('bucket')}
            />
            <SettingInput
              disabled={interactionLocked}
              onContainerRef={(node) => {
                fieldRefs.current.region = node
              }}
              label="Region"
              placeholder="Enter region (e.g. eu-west-1)"
              value={draft.s3.region}
              error={errors.region}
              onBlur={() => void save(latestDraft.current)}
              onChangeText={(region) => update({ ...draft, s3: { ...draft.s3, region } })}
              onFocus={() => focusField('region')}
            />
            <SettingInput
              disabled={interactionLocked}
              onContainerRef={(node) => {
                fieldRefs.current.accessKeyId = node
              }}
              label="Access key ID"
              placeholder="Enter access key ID"
              value={draft.s3.accessKeyId}
              error={errors.accessKeyId}
              onBlur={() => void save(latestDraft.current)}
              onChangeText={(accessKeyId) => update({ ...draft, s3: { ...draft.s3, accessKeyId } })}
              onFocus={() => focusField('accessKeyId')}
            />
            <View
              ref={(node) => {
                fieldRefs.current.secretAccessKey = node
              }}
            >
              <Text style={styles.label}>Secret access key</Text>
              <View style={styles.secretRow}>
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!interactionLocked}
                  onBlur={() => void save(latestDraft.current)}
                  onChangeText={(secretAccessKey) => update({ ...draft, s3: { ...draft.s3, secretAccessKey } })}
                  onFocus={() => focusField('secretAccessKey')}
                  onSubmitEditing={() => void save(latestDraft.current)}
                  placeholder="Enter secret access key"
                  returnKeyType="done"
                  secureTextEntry={revealed !== 'secretAccessKey'}
                  style={styles.input}
                  value={draft.s3.secretAccessKey}
                />
                <Pressable
                  accessibilityLabel={
                    revealed === 'secretAccessKey' ? 'Hide secret access key' : 'Show secret access key'
                  }
                  accessibilityRole="button"
                  accessibilityState={{
                    expanded: revealed === 'secretAccessKey',
                    disabled: draft.s3.secretAccessKey === '',
                  }}
                  disabled={interactionLocked || draft.s3.secretAccessKey === ''}
                  onPress={() => setRevealed((current) => (current === 'secretAccessKey' ? null : 'secretAccessKey'))}
                  style={styles.eye}
                >
                  <Text>◉</Text>
                </Pressable>
              </View>
            </View>
            {fieldError(errors, 'secretAccessKey')}
            <SettingInput
              disabled={interactionLocked}
              onContainerRef={(node) => {
                fieldRefs.current.endpoint = node
              }}
              keyboardType="url"
              label="Endpoint (optional)"
              placeholder="Enter S3 endpoint URL"
              value={draft.s3.endpoint}
              error={errors.endpoint}
              onBlur={() => void save(latestDraft.current)}
              onChangeText={(endpoint) => update({ ...draft, s3: { ...draft.s3, endpoint } })}
              onFocus={() => focusField('endpoint')}
            />
          </View>
          {Object.keys(errors).some((key) => key !== 'apiKey') ? (
            <Text style={styles.error}>Complete S3 Keys to save.</Text>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  )
}

function SettingInput({
  disabled,
  keyboardType,
  label,
  placeholder,
  value,
  error,
  onBlur,
  onChangeText,
  onFocus,
  onContainerRef,
}: {
  disabled: boolean
  keyboardType?: 'default' | 'url'
  label: string
  placeholder: string
  value: string
  error?: string
  onBlur?(): void
  onChangeText(value: string): void
  onFocus(): void
  onContainerRef(node: View | null): void
}): React.JSX.Element {
  return (
    <View
      ref={(node) => {
        onContainerRef(node)
      }}
      style={styles.field}
    >
      <Text style={styles.label}>{label}</Text>
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        editable={!disabled}
        keyboardType={keyboardType}
        onBlur={onBlur}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onSubmitEditing={onBlur}
        returnKeyType="done"
        placeholder={placeholder}
        style={[styles.input, error ? styles.inputError : null]}
        value={value}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#f2f2f7', flex: 1 },
  header: { alignItems: 'center', height: 56, justifyContent: 'center' },
  title: { color: '#111111', fontSize: 20, fontWeight: '600' },
  close: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    position: 'absolute',
    right: 16,
    width: 44,
  },
  closeText: { fontSize: 32 },
  status: { alignItems: 'center', flexDirection: 'row', gap: 6, justifyContent: 'center' },
  statusText: { alignSelf: 'center', color: '#6b6b70', fontSize: 13, lineHeight: 18 },
  retry: { alignSelf: 'center', minHeight: 44, paddingHorizontal: 12, paddingVertical: 10 },
  content: { gap: 12, padding: 16, paddingBottom: 40 },
  import: {
    backgroundColor: '#ffffff',
    borderColor: '#d1d1d6',
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 16,
  },
  importText: { color: '#111111', fontSize: 17 },
  importStatus: { color: '#6b6b70', fontSize: 13 },
  section: { color: '#4f5870', fontSize: 20, marginTop: 12 },
  helper: { color: '#6b6b70', fontSize: 13, lineHeight: 18 },
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#d1d1d6',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  field: { marginTop: 12 },
  label: { color: '#4f5870', fontSize: 13, marginBottom: 6 },
  input: {
    borderColor: '#d1d1d6',
    borderRadius: 10,
    borderWidth: 1,
    color: '#111111',
    fontSize: 17,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  inputError: { borderColor: '#c62828' },
  secretRow: { alignItems: 'center', flexDirection: 'row' },
  eye: { alignItems: 'center', height: 44, justifyContent: 'center', marginLeft: -52, width: 52 },
  error: { color: '#c62828', fontSize: 13, lineHeight: 18, marginTop: 4 },
})
