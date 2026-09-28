import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { ModelCatalog } from '../../src/settings/ModelCatalogSection'
import type { SettingsSnapshot } from '../../src/secrets/secretService'
import { catalogCache, loadModelCatalog, type CatalogModel } from '../../src/settings/modelCatalog'
vi.mock('../../src/settings/modelCatalog', async (original) => ({
  ...(await original<object>()),
  loadModelCatalog: vi.fn(),
}))
const first: SettingsSnapshot = {
  endpoint: 'https://a.example/v1',
  apiKey: 'fixture',
  s3: { bucket: '', region: '', accessKeyId: '', secretAccessKey: '', endpoint: '' },
  modelPreferences: { 'https://a.example/v1': ['saved'] },
}
function Harness({ saved = first }: { saved?: SettingsSnapshot }) {
  const [draft, setDraft] = useState(saved)
  return <ModelCatalog saved={saved} draft={draft} visible disabled={false} onChange={setDraft} />
}

describe('model catalog controls', () => {
  it('searches names/identifiers, keeps query through toggles, and retains unlisted choices', async () => {
    vi.mocked(loadModelCatalog).mockResolvedValue([
      { id: 'a', name: 'Alpha' },
      { id: 'b', name: 'Beta' },
    ])
    render(<Harness />)
    fireEvent.click(screen.getByLabelText('Manage models'))
    await waitFor(() => expect(screen.getByLabelText('Enable model a')).toBeVisible())
    expect(screen.getByLabelText('Disable model saved')).toBeVisible()
    fireEvent.change(screen.getByLabelText('Search models'), { target: { value: 'ALP' } })
    expect(screen.queryByLabelText('Enable model b')).toBeNull()
    fireEvent.click(screen.getByLabelText('Enable model a'))
    expect(screen.getByLabelText('Disable model a')).toBeChecked()
    expect(screen.getByLabelText('Search models')).toHaveValue('ALP')
    fireEvent.change(screen.getByLabelText('Search models'), { target: { value: 'missing' } })
    expect(screen.getByText('No models match your search.')).toBeVisible()
  })
  it('preserves choices on failure, allows exact manual addition and retry', async () => {
    catalogCache.set(first.endpoint!, [])
    vi.mocked(loadModelCatalog)
      .mockRejectedValueOnce(new Error('Model discovery was not authorized.'))
      .mockResolvedValueOnce([])
    render(<Harness />)
    fireEvent.click(screen.getByLabelText('Manage models'))
    await waitFor(() => expect(screen.getByLabelText('Retry model catalog')).toBeVisible())
    expect(screen.getByLabelText('Disable model saved')).toBeVisible()
    fireEvent.change(screen.getByLabelText('Exact model identifier'), { target: { value: 'Vendor/Exact' } })
    fireEvent.click(screen.getByLabelText('Add model'))
    expect(screen.getByLabelText('Disable model Vendor/Exact')).toBeVisible()
    fireEvent.click(screen.getByLabelText('Disable model Vendor/Exact'))
    expect(screen.getByLabelText('Enable model Vendor/Exact')).not.toBeChecked()
    fireEvent.click(screen.getByLabelText('Enable model Vendor/Exact'))
    expect(screen.getByLabelText('Disable model Vendor/Exact')).toBeChecked()
    fireEvent.click(screen.getByLabelText('Retry model catalog'))
    await waitFor(() => expect(screen.getByText('The provider returned an empty catalog.')).toBeVisible())
    expect(screen.getByLabelText('Disable model Vendor/Exact')).toBeVisible()
  })
  it('does not populate the new endpoint with a late old response', async () => {
    let resolve!: (models: readonly CatalogModel[]) => void
    vi.mocked(loadModelCatalog)
      .mockReturnValueOnce(
        new Promise((finish) => {
          resolve = finish
        }),
      )
      .mockResolvedValueOnce([{ id: 'new', name: 'New provider' }])
    const { rerender } = render(
      <ModelCatalog saved={first} draft={first} visible disabled={false} onChange={() => undefined} />,
    )
    fireEvent.click(screen.getByLabelText('Manage models'))
    await waitFor(() => expect(loadModelCatalog).toHaveBeenCalled())
    const second = { ...first, endpoint: 'https://b.example/v1' }
    rerender(<ModelCatalog saved={second} draft={second} visible disabled={false} onChange={() => undefined} />)
    await waitFor(() => expect(screen.getByLabelText('Enable model new')).toBeVisible())
    await act(async () => resolve([{ id: 'old', name: 'Late' }]))
    expect(screen.queryByLabelText('Enable model old')).toBeNull()
  })
})
