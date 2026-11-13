import { describe, expect, it } from 'vitest'
import { FAUNA, FAUNA_GROUPS, findCatalogDef } from '@/data/catalog'
import { DEFAULT_SUBSTRATES } from '@/data/substrates'
import type { PlacedItem } from '@/data/types'
import { computeCareReport, type CareInputs } from '@/engine/care'
import { getPoolBedNormY } from '@/engine/geometry'
import { addItem } from '@/engine/items'
import { DEFAULT_ROOM } from '@/engine/room'
import { breedStep, huntStep, type BreedConditions } from '@/engine/simulation/breed'
import { REST_FLOOR } from '@/engine/simulation/ecology'
import { updateFauna } from '@/engine/simulation/fauna'
import type { LifeEvent } from '@/engine/simulation/life'
import { eventText } from '@/engine/simulation/report'
import { createWorld } from '@/engine/world'

const NEW_FAUNA = [
  'powder_orange',
  'dwarf_white',
  'bumblebee_millipede',
  'phantasmal_dart',
  'mourning_gecko',
  'nerite_snail',
  'ramshorn_snail',
  'amano_shrimp',
]

function fauna(id: string, uid = id, extra: Partial<PlacedItem> = {}): PlacedItem {
  return {
    uid,
    id,
    category: findCatalogDef(id)!.category,
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
  humidity: 85,
  leaflitter: 3,
  poolHasWater: true,
  cycleProgress: 1,
  poolScore: 100,
  temperature: 24,
  smallPrey: 3,
}

const st = {
  timeSpeed: 1,
  substrates: DEFAULT_SUBSTRATES,
  waterSplit: 0.32,
  lighting: 'sunlight',
} as const
const terrain = { substrates: st.substrates, waterSplit: st.waterSplit }

const careInputs = (items: PlacedItem[], over: Partial<CareInputs> = {}): CareInputs => ({
  items,
  humidity: 85,
  temperature: 24,
  soilMoisture: 70,
  nutrients: 80,
  condensation: 0,
  hasLid: true,
  hasFogger: true,
  pumpFlow: 'gentle',
  vessel: 'paludarium_tank',
  waterSplit: 0.32,
  substrates: DEFAULT_SUBSTRATES,
  cycleProgress: 1,
  room: DEFAULT_ROOM,
  mineralSpots: 0,
  ...over,
})

describe('research fauna catalog', () => {
  it('adds the eight species', () => {
    const ids = FAUNA.map((f) => f.id)
    for (const id of NEW_FAUNA) expect(ids).toContain(id)
  })

  it('groups put every fauna id in exactly one heading', () => {
    const grouped = FAUNA_GROUPS.flatMap((g) => [...g.ids])
    expect(grouped.sort()).toEqual(FAUNA.map((f) => f.id).sort())
    expect(FAUNA_GROUPS.map((g) => g.label)).toEqual([
      'Cleanup crew',
      'Frogs and geckos',
      'Pool and shore',
    ])
  })
})

describe('research fauna breeding', () => {
  const run = (items: PlacedItem[], cond: BreedConditions, days = 20) => {
    const w = createWorld()
    w.items.push(...items)
    const out: LifeEvent[] = []
    for (let d = 0; d < days; d++)
      breedStep(
        w,
        1,
        () => 0.5,
        (e) => out.push(e),
        cond,
      )
    return { w, out }
  }

  it('pair species need two adults', () => {
    expect(run([fauna('bumblebee_millipede')], good).out).toHaveLength(0)
    const two = run([fauna('bumblebee_millipede', 'a'), fauna('bumblebee_millipede', 'b')], good)
    expect(two.out.map((e) => e.kind)).toEqual(['hatch'])
  })

  it('all-female species breed alone', () => {
    expect(run([fauna('mourning_gecko')], good).out.length).toBeGreaterThan(0)
    expect(run([fauna('dwarf_white')], good, 4).out.length).toBeGreaterThan(0)
  })

  it('dart frogs need prey to breed, and nerites never breed', () => {
    const frogs = [fauna('phantasmal_dart', 'a'), fauna('phantasmal_dart', 'b')]
    expect(run(frogs, { ...good, smallPrey: 0 }).out).toHaveLength(0)
    expect(run([fauna('nerite_snail', 'a'), fauna('nerite_snail', 'b')], good).out).toHaveLength(0)
  })
})

describe('huntStep', () => {
  const setup = (preyCount: number) => {
    const w = createWorld()
    w.items.push(fauna('phantasmal_dart', 'frog'))
    for (let i = 0; i < preyCount; i++) w.items.push(fauna('springtails', `s${i}`))
    const out: LifeEvent[] = []
    return { w, out, emit: (e: LifeEvent) => out.push(e) }
  }

  it('a dart frog catches a springtail while you watch', () => {
    const { w, out, emit } = setup(4)
    for (let d = 0; d < 9; d++) huntStep(w, 1, () => 0, emit, { away: false })
    expect(out).toEqual([{ kind: 'eaten', id: 'springtails', uid: 'frog' }])
    expect(w.items.filter((i) => i.id === 'springtails')).toHaveLength(3)
    expect(eventText('eaten', 'springtails')).toBe('The dart frog caught a springtail.')
  })

  it('takes nothing while away, or from the last two', () => {
    const away = setup(4)
    for (let d = 0; d < 20; d++) huntStep(away.w, 1, () => 0, away.emit, { away: true })
    expect(away.out).toHaveLength(0)
    expect(away.w.breed.springtails).toBeLessThan(0)
    const few = setup(2)
    for (let d = 0; d < 20; d++) huntStep(few.w, 1, () => 0, few.emit, { away: false })
    expect(few.w.items).toHaveLength(3)
  })

  it('millipedes nibble ferns when the air is dry', () => {
    const w = createWorld()
    w.items.push(fauna('bumblebee_millipede'), fauna('peacock_fern', 'fern', { vitality: 90 }))
    w.env.humidity = 60
    huntStep(
      w,
      1,
      () => 0,
      () => {},
      { away: false },
    )
    expect(w.items[1].vitality).toBe(86)
    w.env.humidity = 80
    huntStep(
      w,
      1,
      () => 0,
      () => {},
      { away: false },
    )
    expect(w.items[1].vitality).toBe(86)
    w.env.humidity = 60
    huntStep(
      w,
      100,
      () => 0,
      () => {},
      { away: false },
    )
    expect(w.items[1].vitality).toBe(REST_FLOOR - 10)
  })
})

describe('research fauna motion', () => {
  it('mourning geckos hang on the glass and tuck up high by day', () => {
    const w = createWorld()
    const gecko = addItem(w, 'mourning_gecko', 'mature', { terrain, rng: () => 0.5 })!
    for (let i = 0; i < 600; i++) updateFauna(w, st, 1000 / 60, i * 16, () => 0.5)
    expect(gecko.aiState).toBe('hiding')
    expect(gecko.glassY).toBeCloseTo(0.22, 5)
    expect(gecko.y).toBeLessThan(0.3)
  })

  it('nerites stay on the pool bed', () => {
    const w = createWorld()
    const snail = addItem(w, 'nerite_snail', 'mature', { terrain, rng: () => 0.5 })!
    snail.aiState = 'foraging'
    snail.aiTimer = 1e9
    for (let i = 0; i < 300; i++) updateFauna(w, st, 1000 / 60, i * 16, () => 0.5)
    expect(snail.y).toBeCloseTo(getPoolBedNormY(terrain.substrates) - 0.014, 3)
  })
})

describe('research fauna care issues', () => {
  const texts = (items: PlacedItem[], over: Partial<CareInputs> = {}) =>
    computeCareReport(careInputs(items, over)).map((i) => i.text)

  it('dart frogs want a springtail colony', () => {
    expect(texts([fauna('phantasmal_dart')]).join(' ')).toMatch(/Add a colony/)
    expect(texts([fauna('phantasmal_dart'), fauna('springtails')]).join(' ')).toMatch(
      /Add another culture/,
    )
  })

  it('nerites need a lid, and a lone gecko is shy', () => {
    const lid = computeCareReport(careInputs([fauna('nerite_snail')], { hasLid: false }))
    expect(lid.find((i) => /Nerite snails climb out/.test(i.text))?.action?.id).toBe('closeLid')
    expect(texts([fauna('mourning_gecko')]).join(' ')).toMatch(/add a second/)
    expect(
      texts([fauna('mourning_gecko', 'a'), fauna('mourning_gecko', 'b')]).join(' '),
    ).not.toMatch(/add a second/)
  })

  it('dry air sends millipedes after the ferns', () => {
    expect(texts([fauna('bumblebee_millipede')], { humidity: 60 }).join(' ')).toMatch(
      /nibbling the ferns/,
    )
  })
})
