import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_SUBSTRATES } from '@/data/substrates'
import type { PlacedItem } from '@/data/types'
import { addItem } from '@/engine/items'
import { dayTick, slowStep, sproutScale, type DayState } from '@/engine/simulation/dayTick'
import type { LifeEvent } from '@/engine/simulation/life'
import { paceMs } from '@/engine/simulation/pace'
import { createWorld } from '@/engine/world'

const state: DayState = {
  timeSpeed: 1,
  pace: 'garden',
  hasGrowLamp: true,
  pumpFlow: 'gentle',
  substrates: DEFAULT_SUBSTRATES,
  waterSplit: 0.32,
}
const terrain = { substrates: state.substrates, waterSplit: state.waterSplit }
const noEmit = () => {}

const flora = (uid: string, o: Partial<PlacedItem> = {}): PlacedItem => ({
  uid,
  id: 'boston_fern',
  category: 'flora',
  x: 0.6,
  y: 0.5,
  scale: 1,
  rotation: 0,
  flipX: false,
  zIndex: 1,
  ...o,
})

describe('dayTick', () => {
  it('one garden tank day of 250 ms frames advances ecoTime by ~1 and a sprout by 0.6', () => {
    const w = createWorld()
    w.items.push(flora('s', { stage: 'sprout', growthProgress: 0.2 }))
    const frames = paceMs('garden') / 250
    for (let i = 0; i < frames; i++) dayTick(w, state, 250, () => 0.5, noEmit)
    expect(w.ecoTime).toBeCloseTo(1, 6)
    expect(w.items[0].growthProgress).toBeCloseTo(0.8, 6)
    expect(w.items[0].stage).toBe('sprout')
  })

  it('5x runs five times as fast and caps the frame at 250 ms', () => {
    const w = createWorld()
    dayTick(w, { ...state, timeSpeed: 5 }, 100, () => 0.5, noEmit)
    expect(w.ecoTime).toBeCloseTo((100 * 5) / paceMs('garden'), 12)
    const slow = createWorld()
    dayTick(slow, state, 60_000, () => 0.5, noEmit)
    expect(slow.ecoTime).toBeCloseTo(250 / paceMs('garden'), 12)
  })

  it('does nothing when paused', () => {
    const w = createWorld()
    w.env.cycleProgress = 0.2
    w.items.push(flora('s', { stage: 'sprout', growthProgress: 0.2 }))
    dayTick(w, { ...state, timeSpeed: 0 }, 250, () => 0.5, noEmit)
    expect(w.ecoTime).toBe(0)
    expect(w.items[0].growthProgress).toBe(0.2)
    expect(w.env.cycleProgress).toBe(0.2)
  })

  it('a born sprout fills out at progress 1, at its species size, emitting grown', () => {
    const w = createWorld()
    const sprout = flora('b', { stage: 'sprout', growthProgress: 0.95, born: true, scale: 0.6 })
    w.items.push(sprout)
    const events: LifeEvent[] = []
    slowStep(w, 0.1, state, { away: false, emit: (e) => events.push(e) })
    expect(sprout.growthProgress).toBeCloseTo(1.01, 9)
    expect(sprout.stage).toBe('mature')
    expect(sprout.scale).toBe(1.05)
    expect(events).toEqual([{ kind: 'grown', uid: 'b', id: 'boston_fern' }])
  })

  it('nutrients fall with flora and rise with cleanup crew on leaf litter', () => {
    const w = createWorld()
    w.env.nutrients = 50
    for (let i = 0; i < 4; i++) w.items.push(flora(`f${i}`))
    slowStep(w, 1, state, { away: false })
    expect(w.env.nutrients).toBeCloseTo(50 - 0.4 * 4, 9)

    const crewWorld = createWorld()
    crewWorld.env.nutrients = 50
    addItem(crewWorld, 'springtails', 'mature', { terrain })
    addItem(crewWorld, 'isopod', 'mature', { terrain })
    const litter = { ...state, substrates: { ...DEFAULT_SUBSTRATES, leaflitter: 5 } }
    slowStep(crewWorld, 1, litter, { away: false })
    expect(crewWorld.env.nutrients).toBeCloseTo(50 + 1.4 * 2, 9)
    const bare = { ...state, substrates: { ...DEFAULT_SUBSTRATES, leaflitter: 0 } }
    crewWorld.env.nutrients = 50
    slowStep(crewWorld, 1, bare, { away: false })
    expect(crewWorld.env.nutrients).toBeCloseTo(50 + 1.4 * 2 * 0.35, 9)
  })

  it('nutrients stay within [15, 100] by default', () => {
    const w = createWorld()
    for (let i = 0; i < 8; i++) w.items.push(flora(`f${i}`))
    w.env.nutrients = 16
    slowStep(w, 10, state, { away: false })
    expect(w.env.nutrients).toBe(15)
    const crew = createWorld()
    addItem(crew, 'springtails', 'mature', { terrain })
    crew.env.nutrients = 99
    slowStep(
      crew,
      10,
      { ...state, substrates: { ...DEFAULT_SUBSTRATES, leaflitter: 5 } },
      {
        away: false,
      },
    )
    expect(crew.env.nutrients).toBe(100)
  })

  it('nutrientFloor keeps nutrients at min(start, 30)', () => {
    const w = createWorld()
    for (let i = 0; i < 8; i++) w.items.push(flora(`f${i}`))
    const start = w.env.nutrients
    const nutrientFloor = Math.min(start, 30)
    for (let i = 0; i < 100; i++) slowStep(w, 1, state, { away: true, nutrientFloor })
    expect(w.env.nutrients).toBe(30)
    const low = createWorld()
    low.env.nutrients = 22
    low.items.push(flora('f'))
    slowStep(low, 20, state, { away: true, nutrientFloor: Math.min(22, 30) })
    expect(low.env.nutrients).toBe(22)
  })

  it('the pool cycles over 21 days (x0.4 with the pump off) and onCycled fires once at 1', () => {
    const w = createWorld()
    w.env.cycleProgress = 0
    slowStep(w, 1, state, { away: false })
    expect(w.env.cycleProgress).toBeCloseTo(1 / 21, 9)
    const off = createWorld()
    off.env.cycleProgress = 0
    slowStep(off, 1, { ...state, pumpFlow: 'off' }, { away: false })
    expect(off.env.cycleProgress).toBeCloseTo(0.4 / 21, 9)

    const done = createWorld()
    done.env.cycleProgress = 0.99
    const onCycled = vi.fn()
    slowStep(done, 1, state, { away: false, onCycled })
    slowStep(done, 1, state, { away: false, onCycled })
    expect(done.env.cycleProgress).toBe(1)
    expect(onCycled).toHaveBeenCalledTimes(1)
  })

  it('the pool does not cycle without water', () => {
    const w = createWorld()
    w.env.cycleProgress = 0.5
    const onCycled = vi.fn()
    slowStep(w, 5, { ...state, waterSplit: 0 }, { away: false, onCycled })
    expect(w.env.cycleProgress).toBe(0.5)
    expect(onCycled).not.toHaveBeenCalled()
  })

  it('cleanup crew clear 27 patches per crew member per day, oldest first, with a fractional remainder', () => {
    const w = createWorld()
    addItem(w, 'springtails', 'mature', { terrain })
    for (let i = 0; i < 40; i++) w.moldPatches.push({ x: i / 100, size: 10 })
    slowStep(w, 0.5, state, { away: false })
    expect(w.moldPatches).toHaveLength(40 - 13)
    expect(w.moldPatches[0].x).toBeCloseTo(0.13)
    expect(w.moldClearAcc).toBeCloseTo(0.5, 9)
    slowStep(w, 0.5, state, { away: false })
    expect(w.moldPatches).toHaveLength(40 - 27)
    expect(w.moldClearAcc).toBeCloseTo(0, 6)
    // Two crew clear twice as fast.
    addItem(w, 'isopod', 'mature', { terrain })
    slowStep(w, 0.1, state, { away: false })
    expect(w.moldPatches).toHaveLength(13 - 5)
  })

  it('does not bank mold clearing while there is nothing to clear, and needs a crew', () => {
    const w = createWorld()
    addItem(w, 'springtails', 'mature', { terrain })
    slowStep(w, 1, state, { away: false })
    expect(w.moldClearAcc).toBe(0)
    const none = createWorld()
    none.moldPatches.push({ x: 0.5, size: 12 })
    slowStep(none, 3, state, { away: false })
    expect(none.moldPatches).toHaveLength(1)
  })
})

describe('sproutScale', () => {
  it('runs from 0.58 of base up to base as growthProgress goes 0.2 to 1', () => {
    const at = (gp: number) => sproutScale(flora('s', { growthProgress: gp }), 2)
    expect(at(0)).toBeCloseTo(2 * 0.58, 9)
    expect(at(0.2)).toBeCloseTo(2 * (0.58 + 0.2 * 0.42), 9)
    expect(at(1)).toBeCloseTo(2, 9)
    expect(at(1.5)).toBeCloseTo(2, 9)
    expect(sproutScale(flora('s'), 2)).toBeCloseTo(at(0.2), 9)
  })
})
