export const CONVERSATION_FILE_EXTENSION = '.json'
export const MANIFEST_FILE_NAME = 'manifest.json'
export const MANIFEST_VERSION = 1 as const

/**
 * A manifest may arrive from a synced or hand-edited file, so its `fileName`
 * values are treated as untrusted. A conversation file must not be the reserved
 * manifest name and must not contain a path separator.
 */
export function isConversationFileName(name: string): boolean {
  return (
    name !== MANIFEST_FILE_NAME &&
    name.length > CONVERSATION_FILE_EXTENSION.length &&
    !name.startsWith('.') &&
    !Array.from(name).some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127) &&
    !/[%?#:]/.test(name) &&
    name.endsWith(CONVERSATION_FILE_EXTENSION) &&
    !name.includes('/') &&
    !name.includes('\\')
  )
}
