// @vitest-environment node
import { expect, it, vi } from 'vitest'
import { S3Client } from '@aws-sdk/client-s3'
import { createS3Remote } from '../../src/sync/s3Remote'
import { RemoteMissingError } from '../../src/sync/errors'
function spy(client: S3Client) {
  return vi.spyOn(client, 'send') as unknown as ReturnType<
    typeof vi.fn<(command: { input: unknown }) => Promise<unknown>>
  >
}
const config = {
  bucket: 'bucket',
  region: 'us-east-1',
  accessKeyId: 'test',
  secretAccessKey: 'test',
  endpoint: 'http://localhost:9000',
}
it('enumerates every page without trusting the remote manifest', async () => {
  const client = new S3Client({ region: config.region })
  const send = spy(client)
    .mockResolvedValueOnce({
      Contents: [{ Key: 'conversations/a.json' }],
      IsTruncated: true,
      NextContinuationToken: 'next',
    })
    .mockResolvedValueOnce({ Contents: [{ Key: 'conversations/b.json' }], IsTruncated: false })
  expect(await createS3Remote(config, client).listNames()).toEqual(['a.json', 'b.json'])
  expect(send.mock.calls[1]?.[0].input).toMatchObject({ ContinuationToken: 'next', Prefix: 'conversations/' })
  client.destroy()
})
it('rejects truncated listings without continuation rather than silently missing objects', async () => {
  const client = new S3Client({ region: config.region })
  spy(client).mockResolvedValue({ IsTruncated: true })
  await expect(createS3Remote(config, client).listNames()).rejects.toThrow('continuation')
  client.destroy()
})
it('only treats missing objects as absence, not permissions or missing body', async () => {
  const client = new S3Client({ region: config.region })
  const send = spy(client)
  send.mockRejectedValueOnce({ name: 'NoSuchKey' })
  await expect(createS3Remote(config, client).readText('a.json')).rejects.toBeInstanceOf(RemoteMissingError)
  send.mockRejectedValueOnce({ name: 'AccessDenied', $metadata: { httpStatusCode: 403 } })
  await expect(createS3Remote(config, client).readText('a.json')).rejects.not.toBeInstanceOf(RemoteMissingError)
  send.mockResolvedValueOnce({})
  await expect(createS3Remote(config, client).readRevision!('a.json')).rejects.toThrow('body')
  client.destroy()
})
