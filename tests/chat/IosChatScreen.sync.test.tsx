import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import type { Message, ChatOperation, ChatSessionControls } from 'app-20-llmchat'
import type { Conversation } from '../../src/storage'
import type { ReconciliationOptions } from '../../src/sync/reconciliation'

const fixture = vi.hoisted(() => ({
  messages: [] as Message[],
  status: 'idle',
  request: null as ((operation: ChatOperation, controls: ChatSessionControls) => void | Promise<void>) | null,
  callbacks: null as Pick<ReconciliationOptions, 'isActive' | 'onApplied' | 'onHistory' | 'onHolds'> | null,
  read: vi.fn(),
  list: vi.fn(),
  save: vi.fn(),
  run: vi.fn(),
  schedule: vi.fn(),
  locked: false,
  mutate: null as ((work: () => Promise<unknown>) => Promise<unknown>) | null,
  replace: vi.fn(),
}))
vi.mock('../../src/ai', () => ({
  AUTOMATIC_MODEL: 'openrouter/auto',
  createOpenRouterProvider: () => ({
    async *streamChat() {
      yield 'received chunk'
    },
  }),
}))
vi.mock('expo-constants', () => ({ default: {} }))
vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))
vi.mock('react-native-svg', () => ({ default: () => null, Circle: () => null, Path: () => null }))
vi.mock('@expo/ui', () => ({
  Host: ({ children }: { children: React.ReactNode }) => children,
  Picker: Object.assign(() => null, { Item: () => null }),
}))
vi.mock('../../modules/native-rename-alert', () => ({ default: { prompt: vi.fn() } }))
vi.mock('../../src/settings/SettingsSheet', () => ({ SettingsSheet: () => null }))
vi.mock('../../src/secrets/secretService', () => ({
  createSecretService: () => ({ getS3Config: async () => ({ bucket: 'test' }), hasProviderKey: async () => true }),
}))
vi.mock('../../src/storage/conversationFilePort', () => ({
  createConversationFilePort: () => ({ readText: async () => '{}' }),
}))
vi.mock('../../src/storage', async (original) => ({
  ...(await original<object>()),
  createConversationStore: () => ({ list: fixture.list, read: fixture.read, save: fixture.save }),
}))
vi.mock('../../src/sync/syncService', () => ({
  createSyncService: (_local: unknown, _secrets: unknown, _onState: unknown, callbacks: typeof fixture.callbacks) => {
    fixture.callbacks = callbacks
    let tail: Promise<unknown> = Promise.resolve()
    fixture.mutate = (work) => {
      const next = tail
        .catch(() => undefined)
        .then(async () => {
          fixture.locked = true
          try {
            return await work()
          } finally {
            fixture.locked = false
          }
        })
      tail = next
      return next
    }
    return { run: fixture.run, schedule: fixture.schedule, localMutation: fixture.mutate }
  },
}))
vi.mock('app-20-llmchat', () => ({
  ContentRenderer: () => null,
  useChatSession: (options: { request: NonNullable<typeof fixture.request> }) => {
    fixture.request = options.request
    return {
      messages: fixture.messages,
      status: fixture.status,
      replaceMessages: fixture.replace,
      messageActions: {},
      submit: vi.fn(),
      stop: vi.fn(),
    }
  },
  LLMChat: {
    Root: ({
      onChangeDraft,
      renderAboveComposer,
    }: {
      onChangeDraft: (draft: string) => void
      renderAboveComposer: () => React.ReactNode
    }) => (
      <>
        <input aria-label="draft" onChange={(event) => onChangeDraft(event.target.value)} />
        {renderAboveComposer()}
      </>
    ),
  },
}))
import { IosChatScreen } from '../../src/chat/IosChatScreen'
const appState = { addEventListener: () => ({ remove: vi.fn() }) }
const conversation: Conversation = {
  id: 'saved',
  title: 'Saved history',
  model: '',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  draft: '',
  messages: [{ id: 'u', role: 'user', content: 'prompt', createdAt: '2026-01-01T00:00:00Z', status: 'complete' }],
}
const msg = (id: string, role: 'user' | 'assistant', status = 'complete'): Message => ({
  id,
  role,
  status: status as Message['status'],
  createdAt: '2026-01-01T00:00:00Z',
  contentParts: [{ kind: 'text', format: 'plain', text: id }],
})
beforeEach(() => {
  vi.clearAllMocks()
  fixture.messages = []
  fixture.status = 'idle'
  fixture.callbacks = null
  fixture.replace.mockImplementation((messages: Message[]) => {
    fixture.messages = messages
  })
  fixture.list.mockResolvedValue({
    entries: [
      { id: 'saved', title: 'Saved history', fileName: 'saved.json', updatedAt: conversation.updatedAt, model: '' },
    ],
    report: { dropped: 0, repaired: 0, corrupt: 0 },
  })
  fixture.save.mockResolvedValue({ fileName: 'saved.json' })
  fixture.read.mockImplementation(async () => {
    expect(fixture.locked).toBe(true)
    return { kind: 'ok', conversation }
  })
})
async function completeRequest(id: string) {
  const controls = { appendChunk: vi.fn(), complete: vi.fn(), fail: vi.fn(), stopRequested: () => false }
  await act(async () => {
    fixture.request!(
      { id: `operation-${id}`, kind: 'submit', messageId: id, prompt: 'prompt', stopped: false },
      controls,
    )
  })
  await waitFor(() => expect(controls.complete).toHaveBeenCalled())
}
it('loads local history before starting network reconciliation and opens history within local coordination', async () => {
  let release!: (value: unknown) => void
  fixture.list.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        release = resolve
      }),
  )
  render(<IosChatScreen appState={appState} />)
  expect(fixture.run).not.toHaveBeenCalled()
  await waitFor(() => expect(fixture.list).toHaveBeenCalled())
  await act(async () => {
    release({
      entries: [
        { id: 'saved', title: 'Saved history', fileName: 'saved.json', updatedAt: conversation.updatedAt, model: '' },
      ],
      report: {},
    })
  })
  await waitFor(() => expect(fixture.run).toHaveBeenCalled())
  fireEvent.click(screen.getByLabelText('Open conversations'))
  await waitFor(() => expect(screen.getByText('Saved history')).toBeVisible())
  fireEvent.click(screen.getByText('Saved history'))
  await waitFor(() => expect(fixture.read).toHaveBeenCalledWith('saved'))
  expect(fixture.replace).toHaveBeenCalled()
})
it('queues a completed response once, not chunks, stopped or failed responses; edit-resend gets another commit', async () => {
  fixture.messages = [msg('u', 'user'), msg('reply', 'assistant', 'streaming')]
  fixture.status = 'streaming'
  const view = render(<IosChatScreen appState={appState} />)
  await waitFor(() => expect(fixture.run).toHaveBeenCalled())
  expect(fixture.save).not.toHaveBeenCalled()
  await completeRequest('reply')
  fixture.messages = [msg('u', 'user'), msg('reply', 'assistant')]
  fixture.status = 'idle'
  view.rerender(<IosChatScreen appState={appState} />)
  await waitFor(() => expect(fixture.schedule).toHaveBeenCalled())
  const saves = fixture.save.mock.calls.length
  view.rerender(<IosChatScreen appState={appState} />)
  expect(fixture.save).toHaveBeenCalledTimes(saves)
  fixture.messages = [msg('u', 'user'), msg('failed', 'assistant', 'error')]
  view.rerender(<IosChatScreen appState={appState} />)
  fixture.messages = [msg('u', 'user'), msg('stopped', 'assistant', 'stopped')]
  view.rerender(<IosChatScreen appState={appState} />)
  expect(fixture.save).toHaveBeenCalledTimes(saves)
  await completeRequest('resent')
  fixture.messages = [msg('u', 'user'), msg('resent', 'assistant')]
  view.rerender(<IosChatScreen appState={appState} />)
  await waitFor(() => expect(fixture.save.mock.calls.length).toBeGreaterThan(saves))
})

it('keeps a download queued behind history selection and applies it to live state before another save', async () => {
  let release!: () => void
  const readWait = new Promise<void>((resolve) => {
    release = resolve
  })
  fixture.read.mockImplementation(async () => {
    expect(fixture.locked).toBe(true)
    await readWait
    return { kind: 'ok', conversation }
  })
  render(<IosChatScreen appState={appState} />)
  await waitFor(() => expect(fixture.run).toHaveBeenCalled())
  fireEvent.click(screen.getByLabelText('Open conversations'))
  await waitFor(() => expect(screen.getByText('Saved history')).toBeVisible())
  fireEvent.click(screen.getByText('Saved history'))
  await waitFor(() => expect(fixture.read).toHaveBeenCalled())
  const downloaded = {
    ...conversation,
    messages: [{ ...conversation.messages[0]!, content: 'accepted remote content' }],
    updatedAt: '2026-02-01T00:00:00.000Z',
  }
  const applying = fixture.mutate!(async () => {
    fixture.callbacks!.onApplied!('saved.json', downloaded)
  })
  expect(fixture.replace).not.toHaveBeenCalled()
  await act(async () => {
    release()
    await applying
  })
  expect(fixture.replace.mock.calls.at(-1)?.[0][0].contentParts[0].text).toBe('accepted remote content')
  fireEvent.change(screen.getByLabelText('draft'), { target: { value: 'draft after import' } })
  fireEvent.click(screen.getByLabelText('New chat'))
  await waitFor(() => expect(fixture.save).toHaveBeenCalled())
  expect(fixture.save.mock.calls[0]?.[0].messages[0].content).toBe('accepted remote content')
})

it('opening or downloading completed history never triggers a completion save or drops rich data', async () => {
  const rich = {
    ...conversation,
    model: 'another/model',
    selectionProvenance: { endpoint: 'https://other.example' },
    messages: [
      ...conversation.messages,
      {
        id: 'tool',
        role: 'tool' as const,
        content: 'hidden',
        createdAt: conversation.updatedAt,
        status: 'complete' as const,
      },
      {
        id: 'old-reply',
        role: 'assistant' as const,
        content: 'old reply',
        createdAt: conversation.updatedAt,
        status: 'complete' as const,
      },
    ],
  }
  fixture.read.mockResolvedValue({ kind: 'ok', conversation: rich })
  const view = render(<IosChatScreen appState={appState} />)
  await waitFor(() => expect(fixture.run).toHaveBeenCalled())
  fireEvent.click(screen.getByLabelText('Open conversations'))
  await waitFor(() => expect(screen.getByText('Saved history')).toBeVisible())
  fireEvent.click(screen.getByText('Saved history'))
  await waitFor(() => expect(fixture.replace).toHaveBeenCalled())
  expect(fixture.save).not.toHaveBeenCalled()
  expect(fixture.schedule).not.toHaveBeenCalled()
  await act(async () => {
    await fixture.mutate!(async () => {
      fixture.callbacks!.onApplied!('saved.json', rich)
    })
  })
  view.rerender(<IosChatScreen appState={appState} />)
  expect(fixture.save).not.toHaveBeenCalled()
  expect(fixture.schedule).not.toHaveBeenCalled()
  fireEvent.change(screen.getByLabelText('draft'), { target: { value: 'intentional edit' } })
  fireEvent.click(screen.getByLabelText('New chat'))
  await waitFor(() => expect(fixture.save).toHaveBeenCalled())
  const saved = fixture.save.mock.calls[0]![0] as Conversation
  expect(saved.model).toBe(rich.model)
  expect(saved.selectionProvenance).toEqual(rich.selectionProvenance)
  expect(saved.messages.map((message) => message.role)).toEqual(['user', 'tool', 'assistant'])
})
