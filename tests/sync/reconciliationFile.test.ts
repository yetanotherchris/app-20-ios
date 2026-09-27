import { expect, it, vi } from 'vitest'
vi.mock('expo-file-system', () => ({ Directory: vi.fn(), File: vi.fn(), Paths: {} }))
import { parseReconciliationState } from '../../src/sync/reconciliationFile'
const state = {
  version: 1,
  destination: 'identity',
  operations: [],
  holds: [],
  deferred: [],
  recovery: [],
  legacyDeletes: [],
}
it.each([
  { ...state, operations: [{ name: '%2fsync.json', revision: 1, content: null }] },
  {
    ...state,
    holds: [
      {
        name: 'a.json',
        kind: 'conflict',
        destination: 'other',
        token: 'token',
        baseline: null,
        remote: { text: '{}' },
      },
    ],
  },
  { ...state, deferred: [{ name: 'a.json', baseline: null, remote: { text: 'broken', bytes: [999] } }] },
  { ...state, recovery: [null] },
  { ...state, legacyDeletes: ['../a.json'] },
])('fails closed on corrupted private sync protection records', (value) =>
  expect(() => parseReconciliationState(value)).toThrow('Sync recovery state could not be loaded.'),
)
it('accepts byte-preserving recovery outside canonical history', () => {
  expect(
    parseReconciliationState({ ...state, recovery: [{ destination: 'old', name: 'a.json', text: '�', bytes: [255] }] })
      .recovery[0]?.bytes,
  ).toEqual([255])
})
