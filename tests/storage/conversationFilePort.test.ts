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
