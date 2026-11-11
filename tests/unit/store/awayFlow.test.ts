import { act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createLocalBackend } from '@/auth/backend'
import { registerWorld, unregisterWorld } from '@/engine/engineBridge'
import type { AwayReport } from '@/engine/simulation/report'
import { createWorld, type EngineWorld } from '@/engine/world'
import { journalFromReport, plusOneDay, recordReport } from '@/store/awayFlow'
import { useAccountStore } from '@/store/useAccountStore'
import { useOverlayStore } from '@/store/useOverlayStore'
import { createDefaultState, useStudioStore } from '@/store/useStudioStore'
import { MemoryStorage } from '../components/auth/authHarness'

const report = (over: Partial<AwayReport> = {}): AwayReport => ({
  from: 1000,
  to: 2000,
  hours: 5,
  tankHours: 5,
  capped: false,
  mode: 'away',
  reason: 'return',
  items: [],
  more: 0,
  rest: [],
  hints: [],
  ...over,
})

const initialAccount = useAccountStore.getState()
let world: EngineWorld

beforeEach(() => {
  useStudioStore.setState(createDefaultState())
  useOverlayStore.setState({ growthBoardOpen: false, awayIndex: null, tour: null })
  world = createWorld()
  registerWorld(world)
})

afterEach(() => {
  useAccountStore.setState(initialAccount, true)
  unregisterWorld()
  vi.restoreAllMocks()
})

describe('journalFromReport', () => {
  it('writes "One day later: …" for day mode and the quiet line when empty', () => {
    const items: AwayReport['items'] = [
      { kind: 'frond', text: 'A fern unfurled a frond.', uid: 'a', id: 'fern', count: 1 },
      { kind: 'bud', text: 'A bud formed.', uid: 'b', id: 'rose', count: 1 },
    ]
    const day = journalFromReport(report({ mode: 'day', items, from: 5, to: 9 }))
    expect(day.note).toBe('One day later: A fern unfurled a frond. A bud formed.')
    expect(day.events).toEqual([
      { kind: 'frond', text: 'A fern unfurled a frond.' },
      { kind: 'bud', text: 'A bud formed.' },
    ])
    expect(day.key).toBe('day:5:9')

    const away = journalFromReport(report({ items, hours: 5 }))
    expect(away.note).toBe('While you were away (5 h): A fern unfurled a frond. A bud formed.')
    expect(away.key).toBe('away:1000:2000')

    const quiet = journalFromReport(report())
    expect(quiet.note).toBe('A quiet stretch. The tank rested while you were away.')
    expect(quiet.events).toEqual([])
  })
})

describe('recordReport', () => {
  it('opens the card and logs once per key', () => {
    const r = report()
    recordReport(r, { journal: false })
    expect(useStudioStore.getState().awayLog).toHaveLength(1)
    expect(useOverlayStore.getState().awayIndex).toBe(0)

    useOverlayStore.getState().closeAway()
    recordReport({ ...r }, { journal: false })
    expect(useStudioStore.getState().awayLog).toHaveLength(1)
    expect(useOverlayStore.getState().awayIndex).toBe(0)

    recordReport(report({ to: 3000 }), { journal: false })
    expect(useStudioStore.getState().awayLog).toHaveLength(2)
  })

  it('journals only when signed in with a terrarium open, once per key', async () => {
    const backend = createLocalBackend('u_demo', new MemoryStorage())
    const add = vi.spyOn(backend, 'addJournal')
    const r = report({ mode: 'day' })
    useAccountStore.setState({ phase: 'signedout', activeId: 'g_a', backend })
    recordReport(r, { journal: true })
    await act(async () => {})
    expect(add).not.toHaveBeenCalled()

    useAccountStore.setState({ phase: 'cloud', activeId: 'g_a', backend })
    recordReport(r, { journal: false })
    await act(async () => {})
    expect(add).not.toHaveBeenCalled()

    recordReport(r, { journal: true })
    await vi.waitFor(() => expect(useAccountStore.getState().journal).toHaveLength(1))
    expect(useAccountStore.getState().journal[0]).toMatchObject({
      auto: true,
      key: 'day:1000:2000',
      note: 'A quiet stretch. The tank rested while you were away.',
    })
    recordReport(r, { journal: true })
    await act(async () => {})
    expect(add).toHaveBeenCalledTimes(1)
  })

  it('flushes the caught-up world to the stores before journaling, so the entry carries its day', async () => {
    const backend = createLocalBackend('u_demo', new MemoryStorage())
    useAccountStore.setState({ phase: 'cloud', activeId: 'g_a', backend })
    useStudioStore.setState({ dayCount: 1 })
    // The catch-up moved the world three days on; nothing has pushed it to the stores yet.
    world.ecoTime = 3.2
    world.env.nutrients = 12
    const staleIssues = world.careIssues
    recordReport(report({ to: 9000 }), { journal: true })
    // The care report is recomputed for the caught-up world.
    expect(world.careIssues).not.toBe(staleIssues)
    expect(useStudioStore.getState().dayCount).toBe(4)
    await vi.waitFor(() => expect(useAccountStore.getState().journal).toHaveLength(1))
    expect(useAccountStore.getState().journal[0]).toMatchObject({
      day: 4,
      metrics: { nutrients: 12 },
    })
  })

  it('routes a journal failure to handleCloudError', async () => {
    const backend = createLocalBackend('u_demo', new MemoryStorage())
    const handle = vi.fn()
    vi.spyOn(backend, 'addJournal').mockRejectedValue(new Error('offline'))
    useAccountStore.setState({ phase: 'cloud', activeId: 'g_a', backend })
    const add = vi.fn().mockRejectedValue(new Error('boom'))
    useAccountStore.setState({ addJournalEntry: add, handleCloudError: handle })
    recordReport(report(), { journal: true })
    await vi.waitFor(() => expect(handle).toHaveBeenCalledTimes(1))
  })
})

describe('plusOneDay', () => {
  it('runs a tank day, logs a day report and opens the card', () => {
    const now = Date.UTC(2026, 10, 8, 12)
    const toast = plusOneDay(() => 0.99, now)
    expect(toast).toMatch(/^Day 2: plants grew/)
    const s = useStudioStore.getState()
    expect(s.dayCount).toBe(2)
    expect(s.awayLog).toHaveLength(1)
    expect(s.awayLog[0]).toMatchObject({ mode: 'day', reason: '+1 day', tankHours: 24, to: now })
    expect(useOverlayStore.getState().awayIndex).toBe(0)
    expect(world.moldPatches).toHaveLength(0)
  })

  it('adds a mold patch within the first three days when the roll is under 60 %', () => {
    plusOneDay(() => 0.1, 5_000_000)
    expect(world.moldPatches).toHaveLength(1)
    expect(world.moldPatches[0].size).toBeCloseTo(9 + 0.1 * 5, 9)
  })

  it('adds no mold after the first three days', () => {
    useStudioStore.setState({ dayCount: 10, setupDay: 1 })
    world.ecoTime = 9
    plusOneDay(() => 0.1, 5_000_000)
    expect(world.moldPatches).toHaveLength(0)
  })

  it('says the pool has cycled when the day finishes the cycle', () => {
    world.env.cycleProgress = 0.99
    expect(plusOneDay(() => 0.99, 5_000_000)).toBe('Day 2: plants grew. The pool has cycled.')
  })
})
