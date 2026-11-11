import { describe, expect, it } from 'vitest'
import {
  faunaRows,
  floraRow,
  healthChip,
  tankStats,
  upNext,
  type FaunaRow,
  type FloraRow,
} from '@/components/growth/growthRows'
import { findCatalogDef } from '@/data/catalog'
import type { PlacedItem } from '@/data/types'
import { breedConditions, type BreedConditions } from '@/engine/simulation/breed'
import { createWorld } from '@/engine/world'
import { createDefaultState } from '@/store/useStudioStore'

const item = (id: string, over: Partial<PlacedItem> = {}): PlacedItem => ({
  uid: `${id}-${Math.random().toString(36).slice(2, 6)}`,
  id,
  category: findCatalogDef(id)?.category === 'fauna' ? 'fauna' : 'flora',
  x: 0.5,
  y: 0.5,
  scale: findCatalogDef(id)?.baseScale ?? 1,
  rotation: 0,
  flipX: false,
  zIndex: 1,
  ...over,
})

const bloom = (cyc: number, over: Partial<PlacedItem> = {}): PlacedItem =>
  item('cryptanthus_pink', {
    stage: 'mature',
    vitality: 100,
    life: { cyc, n: 0, tendrils: 0 },
    ...over,
  })

const GOOD: BreedConditions = {
  nutrients: 80,
  soilMoisture: 80,
  humidity: 80,
  leaflitter: 5,
  poolHasWater: true,
  cycleProgress: 1,
  poolScore: 100,
}

describe('healthChip', () => {
  it('maps vitality to a label and tone, and resting wins', () => {
    expect(healthChip(item('fittonia', { vitality: 90 }))).toEqual({
      label: 'Thriving',
      tone: 'good',
    })
    expect(healthChip(item('fittonia', { vitality: 80 }))).toEqual({
      label: 'Healthy',
      tone: 'good',
    })
    expect(healthChip(item('fittonia', { vitality: 60 }))).toEqual({
      label: 'Slowed',
      tone: 'fair',
    })
    expect(healthChip(item('fittonia', { vitality: 40 }))).toEqual({
      label: 'Struggling',
      tone: 'bad',
    })
    expect(healthChip(item('fittonia', { vitality: 95, resting: true }))).toEqual({
      label: 'Resting',
      tone: 'rest',
    })
    expect(healthChip(item('fittonia')).label).toBe('Thriving')
  })
})

describe('floraRow', () => {
  it('a sprout shows Seedling when born, bar (gp-0.2)/0.8 and "Fills out …"', () => {
    const born = floraRow(
      item('fittonia', { stage: 'sprout', growthProgress: 0.6, born: true }),
      0.55,
      'garden',
    )
    expect(born.phase).toBe('Seedling')
    expect(born.bar).toBeCloseTo(0.5)
    expect(born.next).toMatch(/^Fills out in about/)
    // (1 - 0.6) / 0.6 tank days at 2 h per day = 1.3 h
    expect(born.eta).toBeCloseTo(0.4 / 0.6)
    expect(born.next).toBe('Fills out in about 1.3 h')
    expect(born.ticks).toEqual([])
    const planted = floraRow(item('fittonia', { stage: 'sprout' }), 0.55, 'garden')
    expect(planted.phase).toBe('Sprout')
    expect(planted.bar).toBe(0)
  })

  it('a bloom plant at 0.6 is "In bud" with next "Buds open in about …"', () => {
    const row = floraRow(bloom(0.6), 0.55, 'garden')
    expect(row.phase).toBe('In bud')
    expect(row.bar).toBeCloseTo(0.6)
    expect(row.ticks).toEqual([0.5, 0.68, 0.9])
    expect(row.next).toMatch(/^Buds open in about /)
    // (0.68 - 0.6) * 9 days = 0.72 tank days at 2 h = about 1.4 h
    expect(row.eta).toBeCloseTo(0.72)
    expect(row.next).toBe('Buds open in about 1.4 h')
    expect(row.name).toBe(findCatalogDef('cryptanthus_pink')?.name)
    expect(row.uid).toBeDefined()
  })

  it('size is scale over 1.35 x base, capped at 100', () => {
    const base = findCatalogDef('cryptanthus_pink')?.baseScale ?? 1
    expect(floraRow(bloom(0.1, { scale: base }), 0.55, 'garden').size).toBe(Math.round(100 / 1.35))
    expect(floraRow(bloom(0.1, { scale: base * 3 }), 0.55, 'garden').size).toBe(100)
  })

  it('resting → "Paused. Mist or water to wake it"; pace 0 → "Paused until it recovers"; pace 0.4 → " (slowed)"', () => {
    const resting = floraRow(bloom(0.3, { resting: true, vitality: 55 }), 0.55, 'garden')
    expect(resting.next).toBe('Paused. Mist or water to wake it')
    expect(resting.eta).toBeUndefined()
    const stuck = floraRow(bloom(0.3, { vitality: 40 }), 0.55, 'garden')
    expect(stuck.next).toBe('Paused until it recovers')
    expect(stuck.eta).toBeUndefined()
    const slowed = floraRow(bloom(0.3, { vitality: 60 }), 0.55, 'garden')
    expect(slowed.next).toMatch(/^Buds form in about .* \(slowed\)$/)
    // (0.5 - 0.3) * 9 / 0.4
    expect(slowed.eta).toBeCloseTo((0.2 * 9) / 0.4)
    // low light halves a healthy bloom
    const dim = floraRow(bloom(0.3), 0.1, 'garden')
    expect(dim.next).toMatch(/\(slowed\)$/)
    expect(dim.eta).toBeCloseTo((0.2 * 9) / 0.5)
  })

  it('shoot phase appends " · 2 of 4 runners"', () => {
    const row = floraRow(
      item('trailing_ivy', {
        stage: 'mature',
        vitality: 100,
        life: { cyc: 0.4, n: 0, tendrils: 2 },
      }),
      0.55,
      'garden',
    )
    expect(row.phase).toBe('Growing a runner · 2 of 4 runners')
    expect(row.ticks).toEqual([])
    expect(row.next).toMatch(/^The runner reaches out in about /)
  })

  it('a plant without a life entry is Mature / Settled in', () => {
    const row = floraRow(item('x', { category: 'flora', stage: 'mature' }), 0.55, 'garden')
    expect(row.phase).toBe('Mature')
    expect(row.next).toBe('Settled in')
    expect(row.bar).toBe(1)
    expect(row.eta).toBeUndefined()
    expect(row.chip.label).toBe('Thriving')
  })
})

describe('faunaRows', () => {
  it('groups by species with count, uids and young percentage', () => {
    const world = createWorld()
    const a = item('springtails')
    const b = item('springtails', { baby: 0.5 })
    const c = item('springtails', { baby: 0.1 })
    world.items.push(a, b, c, bloom(0.2))
    const rows = faunaRows(world, GOOD, 'garden')
    expect(rows).toHaveLength(1)
    const row = rows[0]!
    expect(row.id).toBe('springtails')
    expect(row.count).toBe(3)
    expect(row.uids).toEqual([a.uid, b.uid, c.uid])
    expect(row.young).toBe(30)
    expect(row.breeding).toEqual({ n: 3, cap: 6 })
    expect(row.chip).toEqual({ label: 'Calm', tone: 'good' })
  })

  it('fauna without a breed entry → "Does not breed in this tank"', () => {
    const world = createWorld()
    world.items.push(item('medaka_fish'))
    const row = faunaRows(world, GOOD, 'garden')[0]!
    expect(row.next).toBe('Does not breed in this tank')
    expect(row.breeding).toBeUndefined()
    expect(row.young).toBeUndefined()
    expect(row.eta).toBeUndefined()
  })

  it('fauna at cap → "Colony is full. Numbers hold steady"; unmet needs → "Waiting for …"', () => {
    const world = createWorld()
    for (let i = 0; i < 3; i++) world.items.push(item('garden_snail'))
    expect(faunaRows(world, GOOD, 'garden')[0]!.next).toBe('Colony is full. Numbers hold steady')
    world.items.pop()
    const dry = faunaRows(world, { ...GOOD, humidity: 30 }, 'garden')[0]!
    expect(dry.next).toBe('Waiting for more humidity')
  })

  it('stressed fauna wait to settle; healthy ones count down to the next young', () => {
    const world = createWorld()
    world.items.push(item('garden_snail'))
    world.env.humidity = 0
    const stressed = faunaRows(world, GOOD, 'garden')[0]!
    expect(stressed.chip).toEqual({ label: 'Stressed', tone: 'bad' })
    expect(stressed.next).toBe('Waiting until they settle down')

    world.env.humidity = 80
    world.env.temperature = 22
    world.breed.garden_snail = 0.5
    const calm = faunaRows(world, GOOD, 'garden')[0]!
    expect(calm.chip.label).toBe('Calm')
    // 0.5 * 9 days
    expect(calm.eta).toBeCloseTo(4.5)
    expect(calm.next).toBe('Next young in about 9 h')
  })

  it('can be built from breedConditions of a real world', () => {
    const world = createWorld()
    world.items.push(item('springtails'))
    const cond = breedConditions(world, createDefaultState())
    expect(faunaRows(world, cond, 'brisk')).toHaveLength(1)
  })
})

describe('tankStats', () => {
  const base = {
    dayCount: 4.7,
    pumpFlow: 'gentle' as const,
    waterSplit: 0,
    pace: 'garden' as const,
  }

  it('Day N, no pool without one, moss cover and patches', () => {
    const world = createWorld()
    world.mossTufts.push(
      { x: 0.2, r: 4.5, w: 0.05, seed: 0.1 },
      { x: 0.3, r: 4.5, w: 0.05, seed: 0.2 },
    )
    const s = tankStats(world, base)
    expect(s.age).toBe('Day 4')
    expect(s.pool).toBeUndefined()
    expect(s.moss).toEqual({ value: '50%', sub: '2 patches' })
    expect(tankStats(createWorld(), base).moss).toEqual({ value: '0%', sub: '0 patches' })
  })

  it('pool: Cycled once done, otherwise percent and a Done eta (slower with the pump off)', () => {
    const world = createWorld()
    world.env.cycleProgress = 1
    expect(tankStats(world, { ...base, waterSplit: 0.32 }).pool).toEqual({
      value: 'Cycled',
      sub: 'Filter bacteria are established',
    })
    world.env.cycleProgress = 0.5
    // 0.5 * 21 = 10.5 tank days at 2 h = 21 h
    expect(tankStats(world, { ...base, waterSplit: 0.32 }).pool).toEqual({
      value: '50%',
      sub: 'Done in about 21 h',
    })
    // pump off: 26.25 tank days = 52.5 h = 2.19 days
    expect(tankStats(world, { ...base, waterSplit: 0.32, pumpFlow: 'off' }).pool).toEqual({
      value: '50%',
      sub: 'Done in about 2 days',
    })
  })
})

describe('upNext', () => {
  const flora = (name: string, eta?: number): FloraRow => ({
    uid: name,
    name,
    chip: { label: 'Healthy', tone: 'good' },
    size: 50,
    phase: 'x',
    bar: 0,
    ticks: [],
    next: `Something happens in ${name}`,
    eta,
  })
  const fauna = (name: string, eta?: number): FaunaRow => ({
    id: name,
    name,
    count: 1,
    uids: [name],
    chip: { label: 'Calm', tone: 'good' },
    next: 'Next young soon',
    eta,
  })

  it('picks the smallest eta or returns null', () => {
    expect(upNext([])).toBeNull()
    expect(upNext([flora('a'), fauna('b')])).toBeNull()
    expect(upNext([flora('a', 3), fauna('b', 0.5), flora('c', 1)])).toEqual({
      name: 'b',
      next: 'next young soon',
    })
    expect(upNext([flora('a', 2)])).toEqual({ name: 'a', next: 'something happens in a' })
  })
})
