import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as SecureStore from 'expo-secure-store'
import { createSecretService } from '../../src/secrets/secretService'

vi.mock('expo-document-picker', () => ({ getDocumentAsync: vi.fn() }))
vi.mock('expo-file-system/legacy', () => ({ readAsStringAsync: vi.fn() }))
vi.mock('expo-secure-store', () => ({ getItemAsync: vi.fn(), setItemAsync: vi.fn(), deleteItemAsync: vi.fn() }))

const config = { bucket: 'my-bucket', region: 'eu-west-2', accessKeyId: 'access', secretAccessKey: 'secret' }
let records: Map<string, string>
beforeEach(() => {
  vi.resetAllMocks()
  records = new Map()
  vi.mocked(SecureStore.getItemAsync).mockImplementation(async (key) => records.get(key) ?? null)
  vi.mocked(SecureStore.setItemAsync).mockImplementation(async (key, value) => {
    records.set(key, value)
  })
  vi.mocked(SecureStore.deleteItemAsync).mockImplementation(async (key) => {
    records.delete(key)
  })
})

describe('atomic protected settings', () => {
  it('commits both groups through one TOML write and recovers on relaunch', async () => {
    const service = createSecretService()
    await service.readSettings()
    vi.mocked(SecureStore.setItemAsync).mockClear()
    await service.commitSettings('new-key', config)
    expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(1)
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('settingsToml', expect.stringContaining('apiKey ='))
    const relaunched = createSecretService()
    expect(await relaunched.getProviderKey()).toBe('new-key')
    expect(await relaunched.getS3Config()).toEqual(config)
  })
  it('failed commit leaves old complete configuration active and retry commits replacement', async () => {
    const service = createSecretService()
    await service.commitSettings('old-key', config)
    vi.mocked(SecureStore.setItemAsync).mockRejectedValueOnce(new Error('failure'))
    await expect(service.commitSettings('new-key', { ...config, secretAccessKey: 'replacement' })).rejects.toThrow()
    const relaunched = createSecretService()
    expect(await relaunched.getProviderKey()).toBe('old-key')
    expect(await relaunched.getS3Config()).toEqual(config)
    await service.commitSettings('new-key', { ...config, secretAccessKey: 'replacement' })
    expect(await relaunched.getProviderKey()).toBe('new-key')
    expect((await relaunched.getS3Config())?.secretAccessKey).toBe('replacement')
  })
  it('omitted S3 keeps destination, null disables, and concurrent manual writes preserve both groups', async () => {
    const service = createSecretService()
    await service.commitSettings('old-key', config)
    await service.commitSettings('partial-import-key')
    expect(await service.getS3Config()).toEqual(config)
    await Promise.all([service.saveApiKey('manual-key'), service.saveS3Config({ ...config, bucket: 'other-bucket' })])
    expect(await service.getProviderKey()).toBe('manual-key')
    expect((await service.getS3Config())?.bucket).toBe('other-bucket')
    await service.commitSettings('', null)
    expect(await createSecretService().getProviderKey()).toBeNull()
    expect(await createSecretService().getS3Config()).toBeNull()
  })
})

describe('legacy migration', () => {
  it('preserves raw API contents and JSON fields across migration and relaunch', async () => {
    records.set('providerKey', '  raw-key\n')
    records.set('s3', JSON.stringify(config))
    const snapshot = await createSecretService().readSettings()
    expect(snapshot.apiKey).toBe('  raw-key\n')
    expect(snapshot.s3).toEqual({ ...config, endpoint: '' })
    expect(await createSecretService().readSettings()).toEqual(snapshot)
    expect(records.get('providerKey')).toBe('  raw-key\n')
    expect(records.get('s3')).toBe(JSON.stringify(config))
    expect(records.get('settingsToml')).toContain('[s3]')
  })
  it('failed migration leaves legacy values recoverable and repeats safely', async () => {
    records.set('providerKey', 'legacy-key')
    records.set('s3', JSON.stringify(config))
    vi.mocked(SecureStore.setItemAsync).mockRejectedValueOnce(new Error('write unavailable'))
    const snapshot = await createSecretService().readSettings()
    expect(snapshot.apiKey).toBe('legacy-key')
    expect(records.has('settingsToml')).toBe(false)
    expect(await createSecretService().readSettings()).toEqual(snapshot)
    expect(records.has('settingsToml')).toBe(true)
  })
  it('new empty settings are authoritative over retained legacy credentials', async () => {
    records.set('providerKey', 'legacy-key')
    records.set('s3', JSON.stringify(config))
    await createSecretService().commitSettings('', null)
    expect(await createSecretService().getProviderKey()).toBeNull()
    expect(await createSecretService().getS3Config()).toBeNull()
  })
  it('preserves partial legacy S3 and reports corrupt records without source text', async () => {
    records.set('s3', JSON.stringify({ accessKeyId: 'legacy-access', secretAccessKey: 'legacy-secret' }))
    expect((await createSecretService().readSettings()).s3.secretAccessKey).toBe('legacy-secret')
    records.set('settingsToml', 'apiKey = "private-source')
    await expect(createSecretService().readSettings()).rejects.toThrow('Protected settings could not be loaded.')
    expect(records.get('s3')).toContain('legacy-secret')
  })
})
