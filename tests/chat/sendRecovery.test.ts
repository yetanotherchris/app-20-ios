import { describe, expect, it } from 'vitest'
import type { Message } from 'app-20-llmchat'
import { classifySettlement, type PendingSubmit } from '../../src/chat/sendRecovery'

function message(id: string, role: Message['role'], status: Message['status']): Message {
  return {
    id,
    role,
    contentParts: [{ kind: 'text', format: 'plain', text: id }],
    status,
    createdAt: '2026-09-23T10:00:00.000Z',
  }
}

const pending = (overrides: Partial<PendingSubmit> = {}): PendingSubmit => ({
  beforeIds: new Set(['m1']),
  text: 'hello',
  wasEditing: false,
  ...overrides,
})

describe('classifySettlement', () => {
  it('reports no action when an ordinary send succeeds', () => {
    const messages = [message('m1', 'user', 'complete'), message('m2', 'assistant', 'complete')]
    expect(classifySettlement(pending(), messages)).toEqual({ kind: 'none' })
  })

  it('rolls back the pending pair on an ordinary send failure (FR-002)', () => {
    const messages = [message('m1', 'user', 'complete'), message('m2', 'assistant', 'error')]
    expect(classifySettlement(pending(), messages)).toEqual({
      kind: 'send-failed',
      removedIds: ['m2'],
    })
  })

  it('retains the edited text on a failed resend (FR-016)', () => {
    const messages = [message('m1', 'user', 'complete'), message('m2', 'assistant', 'error')]
    expect(classifySettlement(pending({ wasEditing: true }), messages)).toEqual({
      kind: 'resend-failed',
    })
  })

  it('restores the parked draft on a successful resend (FR-016)', () => {
    const messages = [message('m1', 'user', 'complete'), message('m2', 'assistant', 'complete')]
    expect(classifySettlement(pending({ wasEditing: true }), messages)).toEqual({
      kind: 'resend-succeeded',
    })
  })

  it('rolls back both added messages when the pair is pending', () => {
    const messages = [
      message('m1', 'user', 'complete'),
      message('m2', 'user', 'complete'),
      message('m3', 'assistant', 'error'),
    ]
    expect(classifySettlement(pending(), messages)).toEqual({
      kind: 'send-failed',
      removedIds: ['m2', 'm3'],
    })
  })
})
