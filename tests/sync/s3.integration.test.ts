// @vitest-environment node
import { afterAll, beforeAll, expect, it } from 'vitest'
import S3rver from 's3rver'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { createS3Remote } from '../../src/sync/s3Remote'
import { createInMemoryConversationPort } from '../../src/storage/testing'
import { ReconciliationCoordinator, type ReconciliationState } from '../../src/sync/reconciliation'
import { serializeConversation } from '../../src/storage'
import type { S3Config } from '../../src/secrets/secretService'

let server: S3rver, directory: string, config: S3Config
beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), 'spec124-s3-'))
  server = new S3rver({
    address: '127.0.0.1',
    port: 0,
    silent: true,
    directory,
    configureBuckets: [{ name: 'sync-test', configs: [] }],
  })
  const address = await server.run()
  config = {
    bucket: 'sync-test',
    region: 'us-east-1',
    endpoint: `http://127.0.0.1:${address.port}`,
    accessKeyId: 'S3RVER',
    secretAccessKey: 'S3RVER',
  }
}, 20000)
afterAll(async () => {
  await server?.close()
  if (directory) await rm(directory, { recursive: true, force: true })
})

it('reconciles startup, completed revisions, manifest, durable retry and delete over real S3 HTTP', async () => {
  const remote = createS3Remote(config)
  const raw = (title: string, updatedAt = '2026-01-01T00:00:00.000Z') =>
    serializeConversation({
      id: 'a',
      title,
      model: '',
      createdAt: updatedAt,
      updatedAt,
      messages: [{ id: 'm', role: 'assistant', content: title, createdAt: updatedAt, status: 'complete' }],
    })
  await remote.writeText('a.json', raw('remote-startup'))
  const local = createInMemoryConversationPort()
  let state: ReconciliationState | null = null
  const storage = {
    read: async () => state,
    write: async (next: ReconciliationState) => {
      state = structuredClone(next)
    },
  }
  const create = () =>
    new ReconciliationCoordinator({ local, remote: () => remote, config: async () => config, storage })
  const sync = create()
  await sync.run()
  expect(local.files.get('a.json')).toContain('remote-startup')
  for (const [index, title] of ['response-one', 'edit-resend'].entries()) {
    local.files.set('a.json', raw(title, `2026-01-0${index + 2}T00:00:00.000Z`))
    await sync.schedule({ name: 'a.json', revision: index + 1, content: local.files.get('a.json')! })
    await sync.run()
    expect(await remote.readText('a.json')).toContain(title)
    expect(JSON.parse(await remote.readText('manifest.json')).conversations[0].title).toBe(title)
  }
  const write = remote.writeRevision
  remote.writeRevision = async () => {
    throw new Error('test outage')
  }
  local.files.set('a.json', raw('offline-completion', '2026-01-05T00:00:00.000Z'))
  await sync.schedule({ name: 'a.json', revision: 3, content: local.files.get('a.json')! })
  await sync.run()
  expect(sync.state()).toBe('error')
  remote.writeRevision = write
  await create().run()
  expect(await remote.readText('a.json')).toContain('offline-completion')
  await sync.deleteLocally('a.json', async () => {
    local.files.delete('a.json')
  })
  await sync.run()
  expect(await remote.listNames()).toEqual(['manifest.json'])
  expect(JSON.parse(await remote.readText('manifest.json')).conversations).toEqual([])
}, 30000)

it('retains malformed non-UTF8 S3 bytes exactly before repair', async () => {
  const client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: true,
    credentials: config,
  })
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: 'conversations/b.json',
        Body: new Uint8Array([255, 254, 0, 128]),
      }),
    )
    const remote = createS3Remote(config)
    const local = createInMemoryConversationPort({
      'b.json': serializeConversation({
        id: 'b',
        title: 'repair',
        model: '',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        messages: [],
      }),
    })
    let state: ReconciliationState | null = null
    const sync = new ReconciliationCoordinator({
      local,
      config: async () => config,
      remote: () => remote,
      storage: {
        read: async () => state,
        write: async (next) => {
          state = structuredClone(next)
        },
      },
    })
    await sync.run()
    expect(sync.holds()[0]?.kind).toBe('malformed')
    await sync.resolve('b.json', 'local', sync.holds()[0]!)
    const recovery = (state as ReconciliationState | null)?.recovery
    expect(recovery?.some((r) => JSON.stringify(r.bytes) === '[255,254,0,128]')).toBe(true)
    expect(await remote.readText('b.json')).toContain('repair')
  } finally {
    client.destroy()
  }
}, 30000)
