import * as DocumentPicker from 'expo-document-picker'
import { File } from 'expo-file-system'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it, vi } from 'vitest'
import type { SecretService, SettingsSnapshot } from '../../src/secrets/secretService'
import { SettingsSheet } from '../../src/settings/SettingsSheet'

vi.mock('expo-document-picker', () => ({ getDocumentAsync: vi.fn() }))
vi.mock('expo-file-system', () => ({ File: vi.fn() }))

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
    vi.mocked(settings.saveApiKey).mockRejectedValue(new Error('SecureStore unavailable'))
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
