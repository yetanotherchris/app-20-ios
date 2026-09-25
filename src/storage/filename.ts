import { CONVERSATION_FILE_EXTENSION } from './constants'

export function conversationFileName(id: string): string {
  return `${id}${CONVERSATION_FILE_EXTENSION}`
}

/**
 * Picks a free conversation file name. An existing file with the base name that
 * is not owned by this conversation is an orphan and is left untouched; the new
 * conversation takes a suffixed name.
 */
export function uniqueConversationFileName(id: string, existingNames: readonly string[]): string {
  const taken = new Set(existingNames)
  const base = conversationFileName(id)
  if (!taken.has(base)) return base

  let counter = 2
  while (taken.has(`${id}-${counter}${CONVERSATION_FILE_EXTENSION}`)) counter += 1
  return `${id}-${counter}${CONVERSATION_FILE_EXTENSION}`
}
