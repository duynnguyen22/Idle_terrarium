import { describe, expect, it } from 'vitest'
import type { PlacedItem, SubstrateDepths } from '@/data/types'
import {
  BREED,
  babyScale,
  breedConditions,
  breedStep,
  spawnBaby,
  type BreedConditions,
} from '@/engine/simulation/breed'
import type { LifeEvent } from '@/engine/simulation/life'
import { createWorld } from '@/engine/world'

function fauna(id: string, uid = id, extra: Partial<PlacedItem> = {}): PlacedItem {
  return {
    uid,
    id,
    category: 'fauna',
    x: 0.5,
    y: 0.5,
    scale: 1,
    rotation: 0,
    flipX: false,
    zIndex: 1,
    ...extra,
  }
}

const good: BreedConditions = {
  nutrients: 80,
  soilMoisture: 70,
  humidity: 80,
  leaflitter: 3,
  poolHasWater: true,
  cycleProgress: 1,
  poolScore: 100,
  temperature: 24,
  smallPrey: 0,
}

function setup(id: string, count = 1) {
  const w = createWorld()
  for (let i = 0; i < count; i++) w.items.push(fauna(id, `${id}_${i}`))
  const out: LifeEvent[] = []
  return { w, out, emit: (e: LifeEvent) => out.push(e) }
}

const rng = () => 0.5
const depths = (over: Partial<SubstrateDepths> = {}): SubstrateDepths => ({
  pebbles: 0,
  charcoal: 0,
  soil: 0,
  sand: 0,
  leaflitter: 0,
  rivergravel: 0,
  water: 0,
  ...over,
})

describe('BREED table', () => {
  it('holds the spec days and caps', () => {
    expect(Object.entries(BREED).map(([id, d]) => [id, d!.days, d!.cap])).toEqual([
      ['springtails', 4, 6],
      ['isopod', 6, 5],
      ['ducky_isopod', 7, 5],
      ['cherry_shrimp', 6, 6],
      ['garden_snail', 9, 3],
      ['powder_orange', 3.5, 6],
      ['dwarf_white', 3, 8],
      ['bumblebee_millipede', 18, 3],
      ['phantasmal_dart', 14, 4],
      ['mourning_gecko', 10, 5],
      ['ramshorn_snail', 4, 8],
    ])
  })
})

describe('breedConditions', () => {
  it('reads env, substrates and the cycled pool', () => {
    const w = createWorld()
    const c = breedConditions(w, {
      substrates: depths({ leaflitter: 2, water: 10 }),
      waterSplit: 0.5,
    })
    expect(c).toMatchObject({
      nutrients: w.env.nutrients,
      soilMoisture: w.env.soilMoisture,
      humidity: w.env.humidity,
      leaflitter: 2,
      poolHasWater: true,
      cycleProgress: 1,
      poolScore: 100,
    })
    expect(breedConditions(w, { substrates: depths(), waterSplit: 0 })).toMatchObject({
      leaflitter: 0,
      poolHasWater: false,
    })
  })
})

describe('breedStep', () => {
  it('springtails breed after 4 days when nutrients > 30 and moisture > 55, emitting hatch', () => {
    const { w, out, emit } = setup('springtails')
    breedStep(w, 3, rng, emit, good)
    expect(w.items).toHaveLength(1)
    expect(w.breed.springtails).toBeCloseTo(0.75)
    breedStep(w, 1, rng, emit, good)
    expect(w.items).toHaveLength(2)
    const baby = w.items[1]!
    expect(baby.baby).toBe(0)
    expect(baby.uid).not.toBe(w.items[0]!.uid)
    expect(out).toEqual([{ kind: 'hatch', uid: baby.uid, id: 'springtails' }])
    expect(w.breed.springtails).toBeCloseTo(0)
  })

  it('does not breed at cap, when the needs are unmet, or when mean stress >= 0.4', () => {
    const capped = setup('springtails', 6)
    breedStep(capped.w, 10, rng, capped.emit, good)
    expect(capped.w.items).toHaveLength(6)
    expect(capped.out).toEqual([])

    const dry = setup('springtails')
    breedStep(dry.w, 10, rng, dry.emit, { ...good, soilMoisture: 55 })
    expect(dry.w.items).toHaveLength(1)
    expect(dry.w.breed.springtails ?? 0).toBe(0)
    breedStep(dry.w, 10, rng, dry.emit, { ...good, nutrients: 30 })
    expect(dry.w.items).toHaveLength(1)

    const stressed = setup('springtails')
    stressed.w.env.humidity = 45 // 20 below the 65 band -> stress 1
    breedStep(stressed.w, 10, rng, stressed.emit, good)
    expect(stressed.w.items).toHaveLength(1)
    expect(stressed.out).toEqual([])
  })

  it('holds progress when conditions are unmet instead of resetting it', () => {
    const { w, emit } = setup('springtails')
    breedStep(w, 2, rng, emit, good)
    breedStep(w, 5, rng, emit, { ...good, nutrients: 10 })
    expect(w.breed.springtails).toBeCloseTo(0.5)
  })

  it('counts babies toward the cap and does not breed without an adult', () => {
    const { w, emit } = setup('garden_snail', 2)
    w.items.push(fauna('garden_snail', 'b', { baby: 0.1 }))
    breedStep(w, 20, rng, emit, good)
    expect(w.items).toHaveLength(3)
    const lone = setup('springtails', 0)
    lone.w.items.push(fauna('springtails', 'b', { baby: 0.1 }))
    lone.w.breed.springtails = 0.99
    breedStep(lone.w, 1, rng, lone.emit, good)
    expect(lone.w.items).toHaveLength(1)
    expect(lone.out).toEqual([])
  })

  it('spawns several in a multi-day step, stopping at cap with progress below 1', () => {
    const { w, out, emit } = setup('springtails', 4)
    breedStep(w, 12, rng, emit, good)
    expect(w.items).toHaveLength(6)
    expect(out).toHaveLength(2)
    expect(w.breed.springtails).toBeCloseTo(0.999)
  })

  it('babies grow up over 3 days and lose the baby field', () => {
    const { w, emit } = setup('springtails')
    const adult = w.items[0]!
    const baby = spawnBaby(w, adult, rng)
    breedStep(w, 1.5, rng, emit, { ...good, nutrients: 0 })
    expect(baby.baby).toBeCloseTo(0.5)
    breedStep(w, 1.5, rng, emit, { ...good, nutrients: 0 })
    expect(baby.baby).toBeUndefined()
    expect('baby' in baby).toBe(false)
    expect(baby.scale).toBe(adult.scale)
  })

  it('cherry shrimp need water, a cycled pool and poolScore > 60', () => {
    const run = (c: Partial<BreedConditions>) => {
      const { w, emit } = setup('cherry_shrimp')
      breedStep(w, 6, rng, emit, { ...good, ...c })
      return w.items.length
    }
    expect(run({})).toBe(2)
    expect(run({ poolHasWater: false })).toBe(1)
    expect(run({ cycleProgress: 0.9 })).toBe(1)
    expect(run({ poolScore: 60 })).toBe(1)
    expect(run({ poolScore: 61 })).toBe(2)
  })

  it('isopods need leaf litter and moisture, snails need humidity', () => {
    const iso = setup('isopod')
    breedStep(iso.w, 6, rng, iso.emit, { ...good, leaflitter: 1 })
    expect(iso.w.items).toHaveLength(1)
    breedStep(iso.w, 6, rng, iso.emit, { ...good, leaflitter: 1.5 })
    expect(iso.w.items).toHaveLength(2)
    const snail = setup('garden_snail')
    breedStep(snail.w, 9, rng, snail.emit, { ...good, humidity: 60 })
    expect(snail.w.items).toHaveLength(1)
    breedStep(snail.w, 9, rng, snail.emit, { ...good, humidity: 61 })
    expect(snail.w.items).toHaveLength(2)
  })

  it('needs phrases are null when satisfied', () => {
    expect(BREED.springtails!.needs(good)).toBeNull()
    expect(BREED.springtails!.needs({ ...good, nutrients: 10 })).toBe('richer, damper soil')
    expect(BREED.isopod!.needs({ ...good, leaflitter: 0 })).toBe('damp leaf litter')
    expect(BREED.cherry_shrimp!.needs({ ...good, poolScore: 10 })).toBe('a cycled pool')
    expect(BREED.garden_snail!.needs({ ...good, humidity: 10 })).toBe('more humidity')
  })
})

describe('spawnBaby and babyScale', () => {
  it('copies a random adult as a newborn beside it, without runtime fields', () => {
    const w = createWorld()
    const adult = fauna('springtails', 'a', { scale: 1.2, vx: 3, vy: 1, parentUid: 'p' })
    w.items.push(adult)
    const baby = spawnBaby(w, adult, () => 1)
    expect(baby).toBe(w.items[1])
    expect(baby.baby).toBe(0)
    expect(baby.id).toBe('springtails')
    expect(baby.uid).not.toBe('a')
    expect(baby.x).toBeCloseTo(0.5 + 0.02)
    expect(baby.zIndex).toBe(2)
    expect(baby.scale).toBe(1.2)
    expect('vx' in baby).toBe(false)
    expect('parentUid' in baby).toBe(false)
  })

  it('breedStep copies the adult picked by rng and strips its runtime state', () => {
    const { w, emit } = setup('springtails', 0)
    w.items.push(
      fauna('springtails', 'a', { x: 0.2, scale: 1 }),
      fauna('springtails', 'b', {
        x: 0.8,
        scale: 1.4,
        aiState: 'wandering',
        aiTimer: 3,
        offsetX: 0.1,
        offsetY: 0.1,
        life: { cyc: 0.3, n: 1, tendrils: 0 },
        resting: true,
        lush: 0.5,
      }),
    )
    breedStep(w, 4, () => 0.99, emit, good)
    const baby = w.items[2]!
    expect(baby.scale).toBe(1.4)
    expect(baby.x).toBeCloseTo(0.8 + (0.99 - 0.5) * 0.04)
    for (const k of ['aiState', 'aiTimer', 'offsetX', 'offsetY', 'life', 'resting', 'lush']) {
      expect(k in baby).toBe(false)
    }
  })

  it('renders babies at 0.55..1 of the adult scale', () => {
    expect(babyScale(fauna('x'), 2)).toBe(2)
    expect(babyScale(fauna('x', 'x', { baby: 0 }), 2)).toBeCloseTo(1.1)
    expect(babyScale(fauna('x', 'x', { baby: 0.5 }), 2)).toBeCloseTo(2 * (0.55 + 0.225))
    expect(babyScale(fauna('x', 'x', { baby: 3 }), 2)).toBeCloseTo(2)
  })
})
