import * as DocumentPicker from 'expo-document-picker'
import { File } from 'expo-file-system'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it, vi } from 'vitest'
import type { SecretService, SettingsSnapshot } from '../../src/secrets/secretService'
import { SettingsSheet } from '../../src/settings/SettingsSheet'

vi.mock('expo-document-picker', () => ({ getDocumentAsync: vi.fn() }))
vi.mock('../../src/settings/modelCatalog', () => ({
  catalogCache: new Map(),
  searchModels: (models: unknown[]) => models,
  loadModelCatalog: vi.fn(async () => []),
}))
vi.mock('expo-file-system', () => ({ File: vi.fn(), Paths: { cache: { uri: 'file:///cache/' } } }))

const savedSettings: SettingsSnapshot = {
  apiKey: 'saved-key',
  s3: { accessKeyId: '', secretAccessKey: '', bucket: '', region: '', endpoint: '' },
}

function deferred<T>(): { promise: Promise<T>; resolve(value: T): void } {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((finish) => {
    resolve = finish
  })
  return { promise, resolve }
}

function service(readSettings: Promise<SettingsSnapshot>): SecretService {
  return {
    getProviderKey: vi.fn(),
    getS3Config: vi.fn(),
    hasProviderKey: vi.fn(),
    import: vi.fn(),
    readSettings: vi.fn(() => readSettings),
    commitSettings: vi.fn(),
    saveApiKey: vi.fn(),
    saveS3Config: vi.fn(),
  }
}

describe('SettingsSheet hydration', () => {
  it('keeps fields locked until the protected settings read completes', async () => {
    const read = deferred<SettingsSnapshot>()
    render(
      <SettingsSheet visible service={service(read.promise)} onClose={() => undefined} onSaved={() => undefined} />,
    )

    const apiKey = screen.getByPlaceholderText('Enter API key')
    expect(apiKey).toHaveAttribute('readonly')
    expect(screen.getByText('Loading settings…')).toBeVisible()

    read.resolve(savedSettings)

    await waitFor(() => expect(apiKey).toHaveValue('saved-key'))
    expect(apiKey).not.toHaveAttribute('readonly')
    fireEvent.change(apiKey, { target: { value: 'new-key' } })
    expect(apiKey).toHaveValue('new-key')
  })

  it('retains the draft and exposes retry after a settings save fails', async () => {
    const settings = service(Promise.resolve(savedSettings))
    vi.mocked(settings.commitSettings).mockRejectedValue(new Error('SecureStore unavailable'))
    render(<SettingsSheet visible service={settings} onClose={() => undefined} onSaved={() => undefined} />)

    const apiKey = screen.getByPlaceholderText('Enter API key')
    await waitFor(() => expect(apiKey).toHaveValue('saved-key'))
    fireEvent.change(apiKey, { target: { value: 'retained-key' } })
    fireEvent.blur(apiKey)

    await waitFor(() => expect(screen.getByLabelText('Retry saving settings')).toBeVisible())
    expect(apiKey).toHaveValue('retained-key')
  })
})

function pickToml(raw: string): void {
  vi.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file:///settings.toml', name: 'settings.toml', lastModified: 0 }],
  })
  vi.mocked(File).mockImplementation(function () {
    return { size: raw.length, bytes: async () => new TextEncoder().encode(raw) } as File
  })
}

describe('TOML import commits', () => {
  it.each(['valid', 'invalid', 'oversized', 'read failure', 'save failure', 'user source'])(
    'cleans only picker cache copies for %s imports',
    async (outcome) => {
      const settings = service(Promise.resolve(savedSettings))
      const remove = vi.fn()
      const raw = outcome === 'invalid' ? 'apiKey = true' : 'apiKey = "new-key"'
      pickToml(raw)
      vi.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({
        canceled: false,
        assets: [
          {
            uri:
              outcome === 'user source' ? 'file:///source/settings.toml' : 'file:///cache/DocumentPicker/settings.toml',
            name: 'settings.toml',
            lastModified: 0,
          },
        ],
      })
      vi.mocked(File).mockImplementation(function () {
        return {
          size: outcome === 'oversized' ? 1024 * 1024 + 1 : raw.length,
          delete: remove,
          bytes: async () => {
            if (outcome === 'read failure') throw new Error()
            return new TextEncoder().encode(raw)
          },
        } as unknown as File
      })
      if (outcome === 'save failure') vi.mocked(settings.commitSettings).mockRejectedValueOnce(new Error())
      render(<SettingsSheet visible service={settings} onClose={() => undefined} onSaved={() => undefined} />)
      await waitFor(() => expect(screen.getByPlaceholderText('Enter API key')).toHaveValue('saved-key'))
      fireEvent.click(screen.getByLabelText('Import from TOML file'))
      await waitFor(() => expect(File).toHaveBeenCalled())
      await waitFor(() => expect(screen.getByLabelText('Import from TOML file')).not.toHaveAttribute('disabled'))
      expect(remove).toHaveBeenCalledTimes(outcome === 'user source' ? 0 : 1)
    },
  )

  it('retains a newer pending edit when an older save completes during the picker', async () => {
    const settings = service(Promise.resolve(savedSettings))
    const write = deferred<void>()
    const onSaved = vi.fn()
    const picker = deferred<DocumentPicker.DocumentPickerResult>()
    vi.mocked(settings.commitSettings).mockReturnValueOnce(write.promise)
    vi.mocked(DocumentPicker.getDocumentAsync).mockReturnValue(picker.promise)
    render(<SettingsSheet visible service={settings} onClose={() => undefined} onSaved={onSaved} />)
    const apiKey = screen.getByPlaceholderText('Enter API key')
    await waitFor(() => expect(apiKey).toHaveValue('saved-key'))
    fireEvent.change(apiKey, { target: { value: 'edit-a' } })
    fireEvent.blur(apiKey)
    await waitFor(() => expect(settings.commitSettings).toHaveBeenCalledWith('edit-a', null))
    fireEvent.change(apiKey, { target: { value: 'edit-b' } })
    fireEvent.click(screen.getByLabelText('Import from TOML file'))
    write.resolve()
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1))
    picker.resolve({ canceled: true, assets: null })
    await waitFor(() => expect(settings.commitSettings).toHaveBeenCalledWith('edit-b', null), { timeout: 2000 })
  })

  it('preserves omitted raw credentials and keeps the saved S3 helper for incomplete drafts', async () => {
    const snapshot = {
      apiKey: '  migrated-key  ',
      s3: {
        bucket: 'my-bucket',
        region: 'eu-west-2',
        accessKeyId: ' access ',
        secretAccessKey: ' secret ',
        endpoint: '',
      },
    }
    const settings = service(Promise.resolve(snapshot))
    pickToml('s3.bucket = "other-bucket"')
    render(<SettingsSheet visible service={settings} onClose={() => undefined} onSaved={() => undefined} />)
    await waitFor(() => expect(screen.getByPlaceholderText('Enter API key')).toHaveValue(snapshot.apiKey))
    fireEvent.click(screen.getByLabelText('Import from TOML file'))
    await waitFor(() =>
      expect(settings.commitSettings).toHaveBeenCalledWith(snapshot.apiKey, {
        ...snapshot.s3,
        bucket: 'other-bucket',
        endpoint: undefined,
      }),
    )
    await waitFor(() => expect(screen.getByText('Imported settings. Saved.')).toBeVisible())
    pickToml('s3.secretAccessKey = ""')
    fireEvent.click(screen.getByLabelText('Import from TOML file'))
    await waitFor(() => expect(settings.commitSettings).toHaveBeenLastCalledWith(snapshot.apiKey, undefined))
    await waitFor(() => expect(screen.getByText('Imported settings. Complete S3 Keys to save.')).toBeVisible())
    await waitFor(() => expect(screen.getByLabelText('Import from TOML file')).not.toHaveAttribute('disabled'))
    expect(screen.getByText('Chats save on this device and to S3.')).toBeVisible()
    fireEvent.blur(screen.getByPlaceholderText('Enter API key'))
    fireEvent.click(screen.getByLabelText('Close settings'))
    expect(settings.saveApiKey).not.toHaveBeenCalled()
    expect(settings.saveS3Config).not.toHaveBeenCalled()
  })

  it.each(['cancelled', 'invalid'])('resumes an interrupted manual autosave after %s import', async (outcome) => {
    const settings = service(Promise.resolve(savedSettings))
    pickToml('apiKey = true')
    if (outcome === 'cancelled')
      vi.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({ canceled: true, assets: null })
    render(<SettingsSheet visible service={settings} onClose={() => undefined} onSaved={() => undefined} />)
    const apiKey = screen.getByPlaceholderText('Enter API key')
    await waitFor(() => expect(apiKey).toHaveValue('saved-key'))
    fireEvent.change(apiKey, { target: { value: 'manual-edit' } })
    fireEvent.click(screen.getByLabelText('Import from TOML file'))
    await waitFor(() => expect(settings.commitSettings).toHaveBeenCalledWith('manual-edit', null), { timeout: 2000 })
    expect(apiKey).toHaveValue('manual-edit')
    expect(settings.commitSettings).toHaveBeenCalledTimes(1)
  })

  it('ignores blur saves while an import commit is pending', async () => {
    const settings = service(Promise.resolve(savedSettings))
    const commit = deferred<void>()
    vi.mocked(settings.commitSettings).mockReturnValue(commit.promise)
    pickToml('apiKey = "replacement"')
    render(<SettingsSheet visible service={settings} onClose={() => undefined} onSaved={() => undefined} />)
    const apiKey = screen.getByPlaceholderText('Enter API key')
    await waitFor(() => expect(apiKey).toHaveValue('saved-key'))
    fireEvent.click(screen.getByLabelText('Import from TOML file'))
    await waitFor(() => expect(settings.commitSettings).toHaveBeenCalledTimes(1))
    fireEvent.blur(apiKey)
    commit.resolve()
    await waitFor(() => expect(screen.getByText('Imported settings. Saved.')).toBeVisible())
    expect(settings.commitSettings).toHaveBeenCalledTimes(1)
    expect(settings.saveApiKey).not.toHaveBeenCalled()
  })

  it('saves provider independently of an incomplete S3 draft through one commit', async () => {
    const settings = service(Promise.resolve(savedSettings))
    pickToml('apiKey = "imported-key"\ns3.bucket = "my-bucket"')
    render(<SettingsSheet visible service={settings} onClose={() => undefined} onSaved={() => undefined} />)
    await waitFor(() => expect(screen.getByPlaceholderText('Enter API key')).toHaveValue('saved-key'))
    fireEvent.click(screen.getByLabelText('Import from TOML file'))
    await waitFor(() => expect(settings.commitSettings).toHaveBeenCalledWith('imported-key', undefined))
    expect(settings.saveApiKey).not.toHaveBeenCalled()
    expect(settings.saveS3Config).not.toHaveBeenCalled()
    expect(screen.getByPlaceholderText('Enter bucket name')).toHaveValue('my-bucket')
    expect(screen.getByText('Imported settings. Complete S3 Keys to save.')).toBeVisible()
    expect(screen.queryByText('Saved')).toBeNull()
  })
  it('retains masked imported draft after failure and retries atomically', async () => {
    const settings = service(Promise.resolve(savedSettings))
    const onSaved = vi.fn()
    vi.mocked(settings.commitSettings).mockRejectedValueOnce(new Error('failure'))
    pickToml('apiKey = "replacement"')
    render(<SettingsSheet visible service={settings} onClose={() => undefined} onSaved={onSaved} />)
    const apiKey = screen.getByPlaceholderText('Enter API key')
    await waitFor(() => expect(apiKey).toHaveValue('saved-key'))
    fireEvent.click(screen.getByLabelText('Show API key'))
    fireEvent.click(screen.getByLabelText('Import from TOML file'))
    await waitFor(() => expect(screen.getByLabelText('Retry saving settings')).toBeVisible())
    expect(apiKey).toHaveValue('replacement')
    expect(apiKey).toHaveAttribute('type', 'password')
    expect(onSaved).not.toHaveBeenCalled()
    expect(screen.queryByText('Saved')).toBeNull()
    fireEvent.click(screen.getByLabelText('Retry saving settings'))
    await waitFor(() => expect(screen.getByText('Imported settings. Saved.')).toBeVisible())
    expect(settings.commitSettings).toHaveBeenCalledTimes(2)
    expect(settings.saveApiKey).not.toHaveBeenCalled()
    expect(onSaved).toHaveBeenCalledTimes(1)
  })
  it('invalid import and picker cancellation preserve draft without writes', async () => {
    const settings = service(Promise.resolve(savedSettings))
    pickToml('apiKey = "replacement"\n[s3]\nbucket = true')
    render(<SettingsSheet visible service={settings} onClose={() => undefined} onSaved={() => undefined} />)
    const apiKey = screen.getByPlaceholderText('Enter API key')
    await waitFor(() => expect(apiKey).toHaveValue('saved-key'))
    fireEvent.click(screen.getByLabelText('Import from TOML file'))
    await waitFor(() => expect(screen.getByText('S3 settings must be text.')).toBeVisible())
    expect(apiKey).toHaveValue('saved-key')
    vi.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({ canceled: true, assets: null })
    fireEvent.click(screen.getByLabelText('Import from TOML file'))
    await waitFor(() => expect(screen.getByLabelText('Import from TOML file')).not.toHaveAttribute('disabled'))
    expect(apiKey).toHaveValue('saved-key')
    expect(settings.commitSettings).not.toHaveBeenCalled()
  })
})

it('explains transfer of local history to a changed S3 destination', async () => {
  render(
    <SettingsSheet
      visible
      service={service(Promise.resolve(savedSettings))}
      onClose={() => undefined}
      onSaved={() => undefined}
    />,
  )
  expect(
    screen.getByText(
      'Changing the bucket, region or endpoint syncs all eligible chats on this device to the new destination.',
    ),
  ).toBeVisible()
})

it('keeps invalid API URL drafts inactive and retries an atomic endpoint/key/model import', async () => {
  const settings = service(Promise.resolve(savedSettings))
  const onSaved = vi.fn()
  render(<SettingsSheet visible service={settings} onClose={() => undefined} onSaved={onSaved} />)
  await waitFor(() => expect(screen.getByPlaceholderText('Enter API key')).toHaveValue('saved-key'))
  fireEvent.change(screen.getByLabelText('API base URL'), { target: { value: 'http://invalid.example' } })
  fireEvent.blur(screen.getByLabelText('API base URL'))
  await waitFor(() =>
    expect(screen.getByText('Use an absolute HTTPS base URL without credentials, query or fragment.')).toBeVisible(),
  )
  expect(settings.commitSettings).not.toHaveBeenCalled()
  expect(screen.queryByText('Complete S3 Keys to save.')).toBeNull()
  fireEvent.click(screen.getByLabelText('Reset API base URL to default'))
  vi.mocked(settings.commitSettings).mockRejectedValueOnce(new Error('interrupted'))
  pickToml('endpoint = "https://new.example/prefix/v1/"\napiKey = "new-fixture-key"\nenabledModels = ["Vendor/exact"]')
  fireEvent.click(screen.getByLabelText('Import from TOML file'))
  await waitFor(() => expect(screen.getByLabelText('Retry saving settings')).toBeVisible())
  expect(onSaved).not.toHaveBeenCalled()
  expect(screen.getByLabelText('API base URL')).toHaveValue('https://new.example/prefix/v1')
  fireEvent.click(screen.getByLabelText('Retry saving settings'))
  await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1))
  expect(settings.commitSettings).toHaveBeenLastCalledWith('new-fixture-key', null, {
    endpoint: 'https://new.example/prefix/v1',
    modelPreferences: { 'https://new.example/prefix/v1': ['Vendor/exact'] },
  })
})
