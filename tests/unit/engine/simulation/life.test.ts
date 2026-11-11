import { describe, expect, it } from 'vitest'
import { findCatalogDef } from '@/data/catalog'
import type { FloraDef, PlacedItem } from '@/data/types'
import { getLandSurfaceNormY } from '@/engine/geometry'
import {
  ensureLife,
  initLife,
  LIFE,
  LIFE_STEPS,
  lifePace,
  lifeStep,
  lightDose,
  nextStep,
  spawnSeedling,
  type LifeEvent,
} from '@/engine/simulation/life'
import { createWorld } from '@/engine/world'

function item(id: string, category: PlacedItem['category'] = 'flora'): PlacedItem {
  return { uid: id, id, category, x: 0.5, y: 0.5, scale: 1, rotation: 0, flipX: false, zIndex: 1 }
}

describe('life tables', () => {
  it('covers the twelve life-cycle species with their spec values', () => {
    expect(Object.keys(LIFE)).toHaveLength(12)
    expect(LIFE.fittonia).toEqual({ kind: 'bloom', days: 8, bloom: 'small flower spikes' })
    expect(LIFE.peacock_fern).toEqual({ kind: 'frond', days: 5 })
    expect(LIFE.subwassertang).toEqual({ kind: 'moss', days: 4 })
  })

  it('lists the milestones of each kind in order', () => {
    expect(LIFE_STEPS.bloom.map((s) => [s.name, s.at])).toEqual([
      ['bud', 0.5],
      ['open', 0.68],
      ['fade', 0.9],
      ['seed', 1],
    ])
    expect(LIFE_STEPS.frond.map((s) => [s.name, s.at])).toEqual([
      ['fiddle', 0.55],
      ['frond', 1],
    ])
    expect(LIFE_STEPS.shoot).toEqual([{ name: 'tendril', at: 1 }])
    expect(LIFE_STEPS.moss).toEqual([{ name: 'spread', at: 1 }])
  })
})

describe('initLife', () => {
  it('gives a bloom plant cyc in [0, 0.45) and leaves hardscape alone', () => {
    const plant = item('fittonia')
    initLife(plant, () => 0.5)
    expect(plant.life).toEqual({ cyc: 0.225, n: 0, tendrils: 0 })
    const rock = item('river_rock', 'hardscape')
    initLife(rock, () => 0.5)
    expect(rock.life).toBeUndefined()
  })

  it('never overwrites existing life', () => {
    const plant = item('fittonia')
    plant.life = { cyc: 0.9, n: 3, tendrils: 1 }
    initLife(plant, () => 0)
    expect(plant.life).toEqual({ cyc: 0.9, n: 3, tendrils: 1 })
  })
})

describe('ensureLife', () => {
  it('initialises life on every eligible item in the world', () => {
    const w = createWorld()
    w.items.push(item('echeveria'), item('river_rock', 'hardscape'))
    ensureLife(w, () => 0.1)
    expect(w.items[0]!.life?.cyc).toBeCloseTo(0.045)
    expect(w.items[1]!.life).toBeUndefined()
  })
})

describe('life stepping', () => {
  const terrain = { substrates: { soil: 30 }, waterSplit: 0 }
  const events = () => {
    const out: LifeEvent[] = []
    return { out, emit: (e: LifeEvent) => out.push(e) }
  }
  const env = { lightDose: 0.55, terrain }
  const plant = (id: string, o: Partial<PlacedItem> = {}): PlacedItem => ({
    ...item(id),
    vitality: 100,
    life: { cyc: 0, n: 0, tendrils: 0 },
    ...o,
  })

  it('lifePace is 0 resting, 1 above 70, 0.4 above 55, else 0; bloom halves in low light', () => {
    expect(lifePace(plant('fittonia', { resting: true }), 0.55)).toBe(0)
    expect(lifePace(plant('fittonia', { vitality: 71 }), 0.55)).toBe(1)
    expect(lifePace(plant('fittonia', { vitality: 70 }), 0.55)).toBe(0.4)
    expect(lifePace(plant('fittonia', { vitality: 56 }), 0.55)).toBe(0.4)
    expect(lifePace(plant('fittonia', { vitality: 55 }), 0.55)).toBe(0)
    expect(lifePace(plant('fittonia'), 0.1)).toBe(0.5)
    expect(lifePace(plant('fittonia', { vitality: 60 }), 0.1)).toBeCloseTo(0.2)
    expect(lifePace(plant('peacock_fern'), 0.1)).toBe(1)
  })

  it('lightDose is 0.55 with a grow lamp and 0.1 without', () => {
    expect(lightDose({ hasGrowLamp: true })).toBe(0.55)
    expect(lightDose({ hasGrowLamp: false })).toBe(0.1)
  })

  it('nextStep is the first threshold above cyc, null without life', () => {
    expect(nextStep(plant('fittonia', { life: { cyc: 0.49, n: 0, tendrils: 0 } }))).toEqual({ name: 'bud', at: 0.5 })
    expect(nextStep(plant('fittonia', { life: { cyc: 0.5, n: 0, tendrils: 0 } }))).toEqual({ name: 'open', at: 0.68 })
    expect(nextStep(plant('fittonia', { life: { cyc: 0.95, n: 0, tendrils: 0 } }))).toEqual({ name: 'seed', at: 1 })
    expect(nextStep(item('fittonia'))).toBeNull()
    expect(nextStep(plant('river_rock'))).toBeNull()
  })

  it('crossing 0.5 on a bloom plant emits bud once', () => {
    const w = createWorld()
    w.items.push(plant('fittonia', { life: { cyc: 0.49, n: 0, tendrils: 0 } }))
    const { out, emit } = events()
    lifeStep(w, 0.1, () => 0.5, emit, env)
    expect(out).toEqual([{ kind: 'bud', uid: 'fittonia', id: 'fittonia' }])
    out.length = 0
    lifeStep(w, 0.1, () => 0.5, emit, env)
    expect(out).toEqual([])
  })

  it('wrapping at 1 emits seed, decrements cyc and increments n', () => {
    const w = createWorld()
    w.items.push(plant('fittonia', { life: { cyc: 0.95, n: 0, tendrils: 0 } }))
    const { out, emit } = events()
    lifeStep(w, 1, () => 0.9, emit, env) // dt 1 / 8 days = 0.125
    expect(out.map((e) => e.kind)).toEqual(['seed'])
    expect(w.items[0]!.life!.cyc).toBeCloseTo(0.075)
    expect(w.items[0]!.life!.n).toBe(1)
  })

  it('seed spawns a seedling 40% of the time with the spec fields', () => {
    const w = createWorld()
    w.items.push(plant('fittonia', { life: { cyc: 0.99, n: 0, tendrils: 0 } }))
    const { out, emit } = events()
    lifeStep(w, 1, () => 0.3, emit, env)
    expect(w.items).toHaveLength(2)
    const child = w.items[1]!
    expect(child.id).toBe('fittonia')
    expect(child.born).toBe(true)
    expect(child.stage).toBe('sprout')
    expect(child.growthProgress).toBe(0.2)
    expect(child.vitality).toBe(90)
    expect(child.scale).toBeCloseTo(0.9 * 0.62)
    expect(child.category).toBe('flora')
    expect(child.life).toBeDefined()
    expect(Math.abs(child.x - 0.5)).toBeLessThanOrEqual(0.06)
    expect(child.y).toBeCloseTo(getLandSurfaceNormY(terrain, child.x))
    expect(out.map((e) => e.kind)).toEqual(['seed', 'seedling'])
    expect(out[1]!.uid).toBe(child.uid)
  })

  it('does not spawn a seedling above the 40% roll, and does not step the new child', () => {
    const w = createWorld()
    w.items.push(plant('fittonia', { life: { cyc: 0.99, n: 0, tendrils: 0 } }))
    lifeStep(w, 1, () => 0.5, () => {}, env)
    expect(w.items).toHaveLength(1)
    const w2 = createWorld()
    w2.items.push(plant('fittonia', { life: { cyc: 0.99, n: 0, tendrils: 0 } }))
    const { out, emit } = events()
    lifeStep(w2, 1, () => 0.3, emit, env)
    expect(out.filter((e) => e.uid !== 'fittonia' && e.kind !== 'seedling')).toEqual([])
  })

  it('refuses a seedling at 18 flora, 3 of a species, or 70 items', () => {
    const parent = plant('fittonia')
    const rng = () => 0.5
    const flora = createWorld()
    flora.items.push(parent)
    for (let i = 0; i < 17; i++) flora.items.push(plant(i % 2 ? 'echeveria' : 'boston_fern', { uid: `f${i}` }))
    expect(flora.items).toHaveLength(18)
    expect(spawnSeedling(flora, parent, rng, terrain)).toBeNull()

    const species = createWorld()
    species.items.push(parent, plant('fittonia', { uid: 'b' }), plant('fittonia', { uid: 'c' }))
    expect(spawnSeedling(species, parent, rng, terrain)).toBeNull()

    const items = createWorld()
    items.items.push(parent)
    for (let i = 0; i < 69; i++) items.items.push(plant('river_rock', { uid: `r${i}`, category: 'hardscape' }))
    expect(items.items).toHaveLength(70)
    expect(spawnSeedling(items, parent, rng, terrain)).toBeNull()

    const ok = createWorld()
    ok.items.push(parent)
    expect(spawnSeedling(ok, parent, rng, terrain)).not.toBeNull()
    expect(ok.items).toHaveLength(2)
  })

  it('frond grows scale 2% up to base*1.35, else drops a leaf', () => {
    const w = createWorld()
    const fern = plant('peacock_fern', { scale: 1, life: { cyc: 0.99, n: 0, tendrils: 0 } })
    w.items.push(fern)
    const base = (findCatalogDef('peacock_fern') as FloraDef).baseScale
    fern.scale = base
    lifeStep(w, 1, () => 0.5, () => {}, env)
    expect(fern.scale).toBeCloseTo(base * 1.02)
    expect(w.ambientMotes).toHaveLength(0)

    fern.scale = base * 1.35
    fern.life = { cyc: 0.99, n: 0, tendrils: 0 }
    lifeStep(w, 1, () => 0.5, () => {}, env)
    expect(fern.scale).toBeCloseTo(base * 1.35)
    expect(w.ambientMotes).toHaveLength(1)
    expect(w.ambientMotes[0]).toMatchObject({ type: 'leaf', x: fern.x, y: fern.y, r: 1.6 })

    fern.life = { cyc: 0.99, n: 0, tendrils: 0 }
    w.ambientMotes = Array.from({ length: 48 }, () => ({ type: 'dust' }))
    lifeStep(w, 1, () => 0.5, () => {}, env)
    expect(w.ambientMotes).toHaveLength(48)
  })

  it('tendril counts up to 4', () => {
    const w = createWorld()
    const ivy = plant('trailing_ivy', { life: { cyc: 0.99, n: 0, tendrils: 3 } })
    w.items.push(ivy)
    lifeStep(w, 1, () => 0.5, () => {}, env)
    expect(ivy.life!.tendrils).toBe(4)
    ivy.life!.cyc = 0.99
    lifeStep(w, 1, () => 0.5, () => {}, env)
    expect(ivy.life!.tendrils).toBe(4)
  })

  it('spread on a moss plant widens or adds a tuft', () => {
    const w = createWorld()
    w.items.push(plant('moss_mound', { life: { cyc: 0.99, n: 0, tendrils: 0 } }))
    lifeStep(w, 1, () => 0.5, () => {}, env)
    expect(w.mossTufts).toHaveLength(1)
  })

  it('does not advance resting plants, low-vitality plants or babies', () => {
    const w = createWorld()
    w.items.push(
      plant('fittonia', { uid: 'a', resting: true }),
      plant('fittonia', { uid: 'b', vitality: 40 }),
      plant('fittonia', { uid: 'c', baby: 0.2 }),
    )
    lifeStep(w, 1, () => 0.5, () => {}, env)
    expect(w.items.map((i) => i.life!.cyc)).toEqual([0, 0, 0])
  })

  it('skips items without a life entry', () => {
    const w = createWorld()
    w.items.push(item('quartz', 'hardscape'), item('tree_frog', 'fauna'), item('fittonia'))
    const { out, emit } = events()
    expect(() => lifeStep(w, 5, () => 0.5, emit, env)).not.toThrow()
    expect(out).toEqual([])
  })
})
