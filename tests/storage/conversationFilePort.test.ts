import { describe, expect, it, vi } from 'vitest'

vi.mock('expo-file-system', () => ({
  Paths: { document: { uri: 'file:///documents/' } },
}))

import { createConversationFilePort, type SandboxFileSystem } from '../../src/storage/conversationFilePort'

function createFileSystem(): SandboxFileSystem {
  return {
    documentDirectory: 'file:///documents/',
    makeDirectoryAsync: vi.fn().mockResolvedValue(undefined),
    readDirectoryAsync: vi.fn().mockResolvedValue(['manifest.json']),
    readAsStringAsync: vi.fn().mockResolvedValue('{}'),
    writeAsStringAsync: vi.fn().mockResolvedValue(undefined),
    moveAsync: vi.fn().mockResolvedValue(undefined),
    deleteAsync: vi.fn().mockResolvedValue(undefined),
  }
}

describe('createConversationFilePort', () => {
  it('writes a temporary sibling before replacing the destination', async () => {
    const fileSystem = createFileSystem()
    const port = createConversationFilePort(fileSystem)

    await port.writeText('manifest.json', '{}')

    expect(fileSystem.writeAsStringAsync).toHaveBeenCalledWith(
      expect.stringMatching(/conversations\/\.manifest\.json\..+\.tmp$/),
      '{}',
    )
    expect(fileSystem.moveAsync).toHaveBeenCalledWith({
      from: expect.stringMatching(/\.tmp$/),
      to: 'file:///documents/conversations/manifest.json',
    })
  })

  it('rejects caller-selected paths', async () => {
    const port = createConversationFilePort(createFileSystem())

    await expect(port.readText('../secret.json')).rejects.toThrow('Invalid conversation file name')
  })

  it('deletes only validated conversation files', async () => {
    const fileSystem = createFileSystem()
    const port = createConversationFilePort(fileSystem)

    await port.deleteText('manifest.json')

    expect(fileSystem.deleteAsync).toHaveBeenCalledWith('file:///documents/conversations/manifest.json', {
      idempotent: true,
    })
    await expect(port.deleteText('../secret.json')).rejects.toThrow('Invalid conversation file name')
  })
})

it.each([
  '%2e%2e%2fsync%2freconciliation.json',
  'manifest.json%23x.json',
  'a?x.json',
  'a#x.json',
  '.json',
  'a\u0000.json',
])('rejects URI-sensitive imported name %s', async (name) => {
  const fileSystem = createFileSystem()
  await expect(createConversationFilePort(fileSystem).writeText(name, '{}')).rejects.toThrow(
    'Invalid conversation file name',
  )
  expect(fileSystem.writeAsStringAsync).not.toHaveBeenCalled()
})
