import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SUBSTRATES } from '@/data/substrates'
import type { PlacedItem } from '@/data/types'
import {
  advanceWorld,
  catchUpSpan,
  CATCHUP_MIN_GAP_MS,
  nudgeOne,
  runCatchUpIfDue,
  type CatchUpState,
} from '@/engine/simulation/catchup'
import * as life from '@/engine/simulation/life'
import type { LifeEvent } from '@/engine/simulation/life'
import { paceMs } from '@/engine/simulation/pace'
import { createWorld, type EngineWorld } from '@/engine/world'
import { useStudioStore } from '@/store/useStudioStore'

const state: CatchUpState = {
  timeSpeed: 1,
  pace: 'garden',
  hasGrowLamp: true,
  pumpFlow: 'gentle',
  substrates: DEFAULT_SUBSTRATES,
  waterSplit: 0.32,
  worldSeed: 'seed-a',
}
const HOUR = 3_600_000
const T0 = 1_700_000_000_000

const plant = (
  uid: string,
  id: string,
  cyc: number,
  extra: Partial<PlacedItem> = {},
): PlacedItem => ({
  uid,
  id,
  category: 'flora',
  x: 0.5,
  y: 0.5,
  scale: 1,
  rotation: 0,
  flipX: false,
  zIndex: 1,
  vitality: 100,
  life: { cyc, n: 0, tendrils: 0 },
  ...extra,
})

function gardenWorld(): EngineWorld {
  const w = createWorld()
  w.items.push(
    plant('a', 'fittonia', 0.1),
    plant('b', 'boston_fern', 0.3),
    plant('c', 'moss_mound', 0.2),
  )
  return w
}

describe('catchUpSpan', () => {
  it('same seed and span give the same report twice', () => {
    const w1 = gardenWorld()
    const w2 = structuredClone(w1)
    const r1 = catchUpSpan(w1, state, T0, T0 + 40 * HOUR, {
      mode: 'away',
      reason: 'return',
      away: true,
      preview: false,
    })
    const r2 = catchUpSpan(w2, state, T0, T0 + 40 * HOUR, {
      mode: 'away',
      reason: 'return',
      away: true,
      preview: false,
    })
    // Seedling uids come from createItemId (random), so compare everything else.
    const bare = (r: typeof r1) => ({
      ...r,
      items: r.items.map((i) => ({ ...i, uid: '' })),
      hints: r.hints.map((h) => ({ ...h, uid: '' })),
    })
    expect(bare(r1)).toEqual(bare(r2))
    expect(w1.items.map((i) => [i.id, i.life?.cyc, i.vitality])).toEqual(
      w2.items.map((i) => [i.id, i.life?.cyc, i.vitality]),
    )
    expect(r1.items.length).toBeGreaterThan(0)
  })

  it('a 2 h garden gap gives 24 tank hours, hours 2 and ecoTime ~ 1', () => {
    const w = gardenWorld()
    const r = catchUpSpan(w, state, T0, T0 + 2 * HOUR, {
      mode: 'away',
      reason: 'return',
      away: true,
      preview: false,
    })
    expect(r.tankHours).toBe(24)
    expect(r.hours).toBe(2)
    expect(r.capped).toBe(false)
    expect(r.mode).toBe('away')
    expect(r.reason).toBe('return')
    expect(w.ecoTime).toBeCloseTo(1, 6)
  })

  it('caps a long gap at 720 tank hours', () => {
    const w = createWorld()
    const r = catchUpSpan(w, { ...state, pace: 'brisk' }, T0, T0 + 21 * 24 * HOUR, {
      mode: 'away',
      reason: 'return',
      away: true,
      preview: false,
    })
    expect(r.tankHours).toBe(720)
    expect(r.capped).toBe(true)
    expect(w.ecoTime).toBeCloseTo(30, 6)
  })

  it('lets opts.tankHours override the computed value', () => {
    const w = createWorld()
    const r = catchUpSpan(w, state, T0, T0 + 1000, {
      mode: 'day',
      reason: 'day',
      away: false,
      preview: false,
      tankHours: 24,
    })
    expect(r.tankHours).toBe(24)
    expect(r.hours).toBeCloseTo(1000 / HOUR, 12)
    expect(w.ecoTime).toBeCloseTo(1, 6)
  })

  it('nudges one plant to its next step when >= 8 tank hours pass with nothing notable', () => {
    const w = createWorld()
    w.items.push(plant('a', 'fittonia', 0.3))
    // 40 min of garden pace = 8 tank hours; the bloom plant gains only ~0.04 of a cycle.
    const r = catchUpSpan(w, state, T0, T0 + (paceMs('garden') / 3) * 1, {
      mode: 'away',
      reason: 'return',
      away: true,
      preview: false,
    })
    expect(r.tankHours).toBeCloseTo(8, 6)
    expect(w.items[0].life?.cyc).toBe(0.5)
    expect(r.items.map((i) => i.kind)).toContain('bud')
  })

  it('restores the world when advanceWorld throws', () => {
    const w = gardenWorld()
    const before = structuredClone(w.items)
    const spy = vi.spyOn(life, 'lifeStep').mockImplementation(() => {
      throw new Error('boom')
    })
    try {
      expect(() =>
        catchUpSpan(w, state, T0, T0 + 2 * HOUR, {
          mode: 'away',
          reason: 'return',
          away: true,
          preview: false,
        }),
      ).toThrow('boom')
    } finally {
      spy.mockRestore()
    }
    expect(w.items).toEqual(before)
    expect(w.ecoTime).toBe(0)
  })

  it('names plants that started resting during the span, once per species', () => {
    const w = createWorld()
    w.env.humidity = 0
    w.env.soilMoisture = 0
    w.items.push(plant('a', 'fittonia', 0.1), plant('b', 'fittonia', 0.1))
    const r = catchUpSpan(w, state, T0, T0 + 4 * HOUR, {
      mode: 'away',
      reason: 'return',
      away: true,
      preview: false,
    })
    expect(w.items.every((i) => i.resting)).toBe(true)
    expect(r.rest).toEqual(['Pink Fittonia'])
  })
})

describe('advanceWorld', () => {
  it('keeps nutrients at or above min(start, 30) while away', () => {
    const w = createWorld()
    w.env.nutrients = 20
    for (let i = 0; i < 6; i++) w.items.push(plant(`p${i}`, 'fittonia', 0))
    advanceWorld(
      w,
      240,
      state,
      () => 0.5,
      () => {},
      true,
    )
    expect(w.env.nutrients).toBeGreaterThanOrEqual(20)
    const high = createWorld()
    high.env.nutrients = 80
    for (let i = 0; i < 6; i++) high.items.push(plant(`p${i}`, 'fittonia', 0))
    advanceWorld(
      high,
      24 * 60,
      state,
      () => 0.5,
      () => {},
      true,
    )
    expect(high.env.nutrients).toBeGreaterThanOrEqual(30)
  })

  it('runs floor(h) whole steps plus a partial one only above 0.02', () => {
    const a = createWorld()
    advanceWorld(
      a,
      3.01,
      state,
      () => 0.5,
      () => {},
      true,
    )
    expect(a.ecoTime).toBeCloseTo(3 / 24, 9)
    const b = createWorld()
    advanceWorld(
      b,
      3.5,
      state,
      () => 0.5,
      () => {},
      true,
    )
    expect(b.ecoTime).toBeCloseTo(4 / 24, 9)
  })
})

describe('nudgeOne', () => {
  it('moves the closest-below plant to its threshold and emits the event', () => {
    const w = createWorld()
    w.items.push(plant('far', 'fittonia', 0.2), plant('near', 'fittonia', 0.4))
    const events: LifeEvent[] = []
    expect(nudgeOne(w, (e) => events.push(e))).toBe(true)
    expect(events).toEqual([{ kind: 'bud', uid: 'near', id: 'fittonia' }])
    expect(w.items[1].life?.cyc).toBe(0.5)
    expect(w.items[0].life?.cyc).toBe(0.2)
  })

  it('skips fade steps, resting plants and plants more than 0.35 away', () => {
    const w = createWorld()
    w.items.push(
      plant('fade', 'fittonia', 0.8),
      plant('rest', 'fittonia', 0.4, { resting: true, vitality: 60 }),
      plant('far', 'fittonia', 0.1),
    )
    expect(nudgeOne(w, () => {})).toBe(false)
  })
})

describe('runCatchUpIfDue', () => {
  beforeEach(() => {
    useStudioStore.setState({
      catchupEnabled: true,
      lastSimulatedAt: T0,
      pace: 'garden',
      worldSeed: 'seed-a',
      awayLog: [],
    })
  })
  afterEach(() => {
    useStudioStore.setState({ awayLog: [], lastSimulatedAt: null })
  })

  it('a gap under 10 minutes is quiet', () => {
    const w = gardenWorld()
    const r = runCatchUpIfDue(w, useStudioStore.getState(), T0 + CATCHUP_MIN_GAP_MS - 1)
    expect(r).toBeNull()
    expect(useStudioStore.getState().awayLog).toEqual([])
    expect(useStudioStore.getState().lastSimulatedAt).toBe(T0)
    expect(w.ecoTime).toBe(0)
  })

  it('ignores a negative gap and resets the clock', () => {
    const w = gardenWorld()
    expect(runCatchUpIfDue(w, useStudioStore.getState(), T0 - 5 * HOUR)).toBeNull()
    expect(useStudioStore.getState().lastSimulatedAt).toBe(T0 - 5 * HOUR)
    expect(useStudioStore.getState().awayLog).toEqual([])
    expect(w.ecoTime).toBe(0)
  })

  it('treats a missing clock as no gap', () => {
    useStudioStore.setState({ lastSimulatedAt: null })
    const w = gardenWorld()
    expect(runCatchUpIfDue(w, useStudioStore.getState(), T0)).toBeNull()
    expect(useStudioStore.getState().lastSimulatedAt).toBe(T0)
  })

  it('does nothing but reset the clock when catch-up is off', () => {
    useStudioStore.setState({ catchupEnabled: false })
    const w = gardenWorld()
    expect(runCatchUpIfDue(w, useStudioStore.getState(), T0 + 5 * HOUR)).toBeNull()
    expect(useStudioStore.getState().lastSimulatedAt).toBe(T0 + 5 * HOUR)
    expect(useStudioStore.getState().awayLog).toEqual([])
    expect(w.ecoTime).toBe(0)
  })

  it('pushes the report to awayLog newest first', () => {
    const w = gardenWorld()
    const first = runCatchUpIfDue(w, useStudioStore.getState(), T0 + 2 * HOUR)
    expect(first?.mode).toBe('away')
    expect(first?.reason).toBe('return')
    expect(useStudioStore.getState().lastSimulatedAt).toBe(T0 + 2 * HOUR)
    const second = runCatchUpIfDue(w, useStudioStore.getState(), T0 + 6 * HOUR)
    const log = useStudioStore.getState().awayLog
    expect(log).toHaveLength(2)
    expect(log[0]).toBe(second)
    expect(log[1]).toBe(first)
    expect(second?.from).toBe(T0 + 2 * HOUR)
  })
})
