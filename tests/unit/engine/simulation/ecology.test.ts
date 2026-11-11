import { describe, expect, it, vi } from 'vitest'
import { findCatalogDef } from '@/data/catalog'
import type { FaunaDef, FloraDef, PlacedItem } from '@/data/types'
import {
  ecologyStep,
  faunaStress,
  itemStress,
  plantStress,
  poolScore,
  REST_FLOOR,
  wakeResting,
  wokeToast,
} from '@/engine/simulation/ecology'
import type { Emit } from '@/engine/simulation/life'
import { FRAME_MS } from '@/engine/simulation/constants'
import { tick } from '@/engine/simulation/tick'
import { createWorld, type EngineWorld } from '@/engine/world'
import { createStudioStore } from '@/store/useStudioStore'

const memoryStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
  key: () => null,
  length: 0,
} as unknown as Storage

const fittonia = findCatalogDef('fittonia') as FloraDef // idealHumidity [65, 92], baseScale 0.9

function plant(o: Partial<PlacedItem> = {}): PlacedItem {
  return {
    uid: 'p1',
    id: 'fittonia',
    category: 'flora',
    x: 0.5,
    y: 0.5,
    scale: 0.9,
    rotation: 0,
    flipX: false,
    zIndex: 1,
    stage: 'mature',
    ...o,
  }
}

function worldWith(items: PlacedItem[], humidity = 78, nutrients = 60): EngineWorld {
  const w = createWorld()
  w.env.humidity = humidity
  w.env.nutrients = nutrients
  w.items = items
  return w
}

describe('stress', () => {
  it('plantStress is 0 inside the ideal humidity band and 1 twenty points outside', () => {
    const env = createWorld().env
    env.nutrients = 60
    env.humidity = 80
    expect(plantStress(fittonia, env)).toBe(0)
    env.humidity = 45
    expect(plantStress(fittonia, env)).toBe(1)
    env.humidity = 55
    expect(plantStress(fittonia, env)).toBeCloseTo(0.5, 5)
  })

  it('low nutrients add 0.3, capped at 1', () => {
    const env = createWorld().env
    env.humidity = 80
    env.nutrients = 10
    expect(plantStress(fittonia, env)).toBeCloseTo(0.3, 5)
    env.humidity = 40
    expect(plantStress(fittonia, env)).toBe(1)
  })

  it('faunaStress adds temperature distance / 6 and treats missing bands as 0', () => {
    const env = createWorld().env
    env.humidity = 50
    env.temperature = 30
    const def = { idealHumidity: [60, 90], idealTemp: [20, 26] } as unknown as FaunaDef
    // humidity 10/20 = 0.5, temperature 4/6 = 0.667 -> capped at 1
    expect(faunaStress(def, env)).toBe(1)
    env.temperature = 23
    expect(faunaStress(def, env)).toBeCloseTo(0.5, 5)
    expect(faunaStress({} as unknown as FaunaDef, env)).toBe(0)
  })

  it('itemStress is 0 for hardscape and unknown ids', () => {
    const env = createWorld().env
    expect(itemStress(plant({ id: 'nope' }), env)).toBe(0)
    expect(itemStress(plant({ category: 'hardscape' }), env)).toBe(0)
  })
})

describe('poolScore', () => {
  it('is 100 when cycled and below 60 mid-cycle', () => {
    expect(poolScore(1)).toBe(100)
    expect(poolScore(0.3)).toBeLessThan(60)
  })
})

describe('ecologyStep', () => {
  it('moves vitality toward target at 0.32/day up and 1.1/day down', () => {
    const up = worldWith([plant({ vitality: 50 })])
    ecologyStep(up, 1, { away: false })
    expect(up.items[0].vitality).toBeCloseTo(66, 5)
    const down = worldWith([plant({ vitality: 100 })], 53) // 12 under 65 -> stress 0.6 -> target 40
    ecologyStep(down, 0.5, { away: false })
    expect(down.items[0].vitality).toBeCloseTo(67, 5)
  })

  it('treats undefined vitality as 100 and skips babies and hardscape', () => {
    const w = worldWith([
      plant({ uid: 'a' }),
      plant({ uid: 'b', baby: 0.2, vitality: 50 }),
      plant({ uid: 'c', category: 'hardscape', id: 'river_rock', vitality: 50 }),
    ])
    ecologyStep(w, 1, { away: false })
    expect(w.items[0].vitality).toBeCloseTo(100, 5)
    expect(w.items[1].vitality).toBe(50)
    expect(w.items[2].vitality).toBe(50)
  })

  it('a stressed plant starts resting only when away, floors at 55 and emits rest', () => {
    const emit = vi.fn<Emit>()
    const home = worldWith([plant({ vitality: 100 })], 30)
    ecologyStep(home, 1, { away: false }, emit)
    expect(home.items[0].resting).toBeFalsy()
    expect(emit).not.toHaveBeenCalled()

    const away = worldWith([plant({ vitality: 100 })], 30)
    for (let i = 0; i < 5; i++) ecologyStep(away, 1, { away: true }, emit)
    expect(away.items[0].resting).toBe(true)
    expect(away.items[0].vitality).toBe(REST_FLOOR)
    expect(emit).toHaveBeenCalledTimes(1)
    expect(emit).toHaveBeenCalledWith({ kind: 'rest', uid: 'p1', id: 'fittonia' })
  })

  it('resting clears when target > 75 and vitality > 75', () => {
    const w = worldWith([plant({ vitality: 70, resting: true })], 78)
    ecologyStep(w, 1, { away: true })
    // 70 + 30*0.32 = 79.6
    expect(w.items[0].vitality).toBeCloseTo(79.6, 5)
    expect(w.items[0].resting).toBe(false)
    const slow = worldWith([plant({ vitality: 55, resting: true })], 78)
    ecologyStep(slow, 1, { away: true })
    expect(slow.items[0].resting).toBe(true)
  })

  it('grows scale up to base*1.35 above 68 vitality and shrinks below 32 to base*0.62', () => {
    const w = worldWith([plant({ vitality: 100 })], 78)
    ecologyStep(w, 1, { away: false })
    expect(w.items[0].scale).toBeCloseTo(0.9 + ((100 - 68) / 32) * 0.045, 5)
    for (let i = 0; i < 100; i++) ecologyStep(w, 1, { away: false })
    expect(w.items[0].scale).toBeCloseTo(0.9 * 1.35, 5)

    const s = worldWith([plant({ vitality: 20 })], 10)
    for (let i = 0; i < 400; i++) ecologyStep(s, 0.5, { away: false })
    expect(s.items[0].vitality as number).toBeLessThan(32)
    expect(s.items[0].scale).toBeCloseTo(0.9 * 0.62, 5)
  })

  it('does not grow or shrink sprouts, and keeps them sprout until growthProgress >= 1', () => {
    const w = worldWith([plant({ stage: 'sprout', growthProgress: 0.5, scale: 0.6, vitality: 100 })])
    ecologyStep(w, 1, { away: false })
    expect(w.items[0].scale).toBe(0.6)
    expect(w.items[0].stage).toBe('sprout')
  })

  it('stage becomes lush when lush > 0.75 and vitality > 85', () => {
    const w = worldWith([plant({ vitality: 100, lush: 0.7 })], 78)
    ecologyStep(w, 1, { away: false })
    expect(w.items[0].lush).toBe(0.95)
    expect(w.items[0].stage).toBe('lush')
    const low = worldWith([plant({ vitality: 100, lush: 0.9, stage: 'lush' })], 78, 10)
    low.env.humidity = 50 // stress 0.75 + 0.3 -> 1, target 4
    ecologyStep(low, 1, { away: false })
    expect(low.items[0].stage).toBe('mature')
    expect(low.items[0].lush as number).toBeLessThan(0.9)
  })
})

describe('wakeResting', () => {
  it('adds 8 vitality, clears resting and returns the names', () => {
    const w = worldWith([
      plant({ uid: 'a', vitality: 60, resting: true }),
      plant({ uid: 'b', vitality: 96, resting: true }),
      plant({ uid: 'c', vitality: 60 }),
    ])
    expect(wakeResting(w)).toEqual(['Pink Fittonia'])
    expect(w.items[0].vitality).toBe(68)
    expect(w.items[0].resting).toBe(false)
    expect(w.items[1].vitality).toBe(100)
    expect(w.items[2].vitality).toBe(60)
    expect(wakeResting(w)).toEqual([])
  })

  it('formats the toast', () => {
    expect(wokeToast(['Fittonia'])).toBe('The Fittonia woke up and perked up.')
    expect(wokeToast(['A', 'B'])).toBe('The A, B woke up and perked up.')
  })
})

describe('tick wake-ups', () => {
  it('wakes resting plants once when misting or pouring starts', () => {
    const store = createStudioStore(memoryStorage)
    const w = createWorld()
    const onToast = vi.fn()
    const run = () => tick(w, FRAME_MS, 1000, { store: store.getState(), onToast })
    w.items = [plant({ vitality: 60, resting: true })]
    run()
    expect(onToast).not.toHaveBeenCalled()
    w.isMisting = true
    run()
    run()
    const wakes = () => onToast.mock.calls.filter((c) => String(c[0]).includes('woke up'))
    expect(wakes()).toHaveLength(1)
    expect(wakes()[0][0]).toBe('The Pink Fittonia woke up and perked up.')
    w.isMisting = false
    run()
    w.items[0].resting = true
    w.isPouring = true
    run()
    run()
    expect(wakes()).toHaveLength(2)
  })

  it('wakes at time speed 0 too', () => {
    const store = createStudioStore(memoryStorage)
    store.getState().setTimeSpeed(0)
    const w = createWorld()
    const onToast = vi.fn()
    w.items = [plant({ vitality: 60, resting: true })]
    w.isMisting = true
    tick(w, FRAME_MS, 1000, { store: store.getState(), onToast })
    expect(onToast).toHaveBeenCalledWith('The Pink Fittonia woke up and perked up.')
  })
})
