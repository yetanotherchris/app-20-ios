import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from '@aws-sdk/client-s3'
import { RemoteMissingError, type SyncRemote } from '.'
import type { S3Config } from '../secrets/secretService'

const PREFIX = 'conversations/'
const REQUEST_TIMEOUT_MS = 15_000

function clientOptions(config: S3Config): S3ClientConfig {
  return {
    region: config.region,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    ...(config.endpoint ? { endpoint: config.endpoint, forcePathStyle: true } : {}),
  }
}

function keyFor(name: string): string {
  return `${PREFIX}${name}`
}

function isMissing(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const value = error as { name?: unknown; $metadata?: { httpStatusCode?: unknown } }
  return value.name === 'NoSuchKey' || value.$metadata?.httpStatusCode === 404
}

async function withTimeout<T>(run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    return await run(controller.signal)
  } finally {
    clearTimeout(timer)
  }
}

/** Maps the shared sync engine's bare names below the fixed conversation prefix. */
export function createS3Remote(config: S3Config, client = new S3Client(clientOptions(config))): SyncRemote {
  return {
    async listNames() {
      const result: string[] = []
      let token: string | undefined
      do {
        const page = await withTimeout((signal) =>
          client.send(
            new ListObjectsV2Command({
              Bucket: config.bucket,
              Prefix: PREFIX,
              ...(token ? { ContinuationToken: token } : {}),
            }),
            { abortSignal: signal },
          ),
        )
        for (const item of page.Contents ?? []) {
          if (item.Key?.startsWith(PREFIX)) result.push(item.Key.slice(PREFIX.length))
        }
        token = page.IsTruncated ? page.NextContinuationToken : undefined
      } while (token)
      return result
    },
    async readText(name) {
      try {
        const object = await withTimeout((signal) =>
          client.send(new GetObjectCommand({ Bucket: config.bucket, Key: keyFor(name) }), {
            abortSignal: signal,
          }),
        )
        if (!object.Body) throw new RemoteMissingError(name)
        return object.Body.transformToString()
      } catch (error) {
        if (isMissing(error)) throw new RemoteMissingError(name)
        throw error
      }
    },
    async writeText(name, content) {
      await withTimeout((signal) =>
        client.send(
          new PutObjectCommand({
            Bucket: config.bucket,
            Key: keyFor(name),
            Body: content,
            ContentType: 'application/json',
          }),
          { abortSignal: signal },
        ),
      )
    },
    async deleteText(name) {
      await withTimeout((signal) =>
        client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: keyFor(name) }), {
          abortSignal: signal,
        }),
      )
    },
  }
}
