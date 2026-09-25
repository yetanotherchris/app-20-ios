import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it, vi } from 'vitest'
import type { SecretService, SettingsSnapshot } from '../../src/secrets/secretService'
import { SettingsSheet } from '../../src/settings/SettingsSheet'

vi.mock('expo-document-picker', () => ({ getDocumentAsync: vi.fn() }))
vi.mock('expo-file-system/legacy', () => ({ readAsStringAsync: vi.fn() }))

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
