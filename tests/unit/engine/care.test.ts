import { describe, expect, it } from 'vitest'
import { findCatalogDef } from '@/data/catalog'
import { DEFAULT_SUBSTRATES } from '@/data/substrates'
import type { PlacedItem } from '@/data/types'
import {
  computeCareReport,
  cycleChemistry,
  cycleDay,
  CYCLE_DAYS,
  idealRange,
  runCareAction,
  type CareInputs,
} from '@/engine/care'
import { createWorld } from '@/engine/world'
import { createStudioStore } from '@/store/useStudioStore'

function makeMemoryStorage(): Storage {
  const m = new Map<string, string>()
  return {
    get length() {
      return m.size
    },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, String(v)),
  }
}
const memoryStorage = makeMemoryStorage()

const item = (id: string) => ({ uid: id, id, category: findCatalogDef(id)!.category }) as PlacedItem
const inputs = (over: Partial<CareInputs>): CareInputs => ({
  items: [],
  humidity: 80,
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
  ...over,
})

describe('care report', () => {
  it('cycleChemistry peaks per the gaussians and is 0 when cycled', () => {
    expect(cycleChemistry(1)).toEqual({ nh3: 0, no2: 0 })
    expect(cycleChemistry(0.3).nh3).toBeCloseTo(3.5, 5)
    expect(cycleChemistry(0.62).no2).toBeCloseTo(2.5, 5)
  })

  it('cycleDay counts from day 1 of CYCLE_DAYS', () => {
    expect(CYCLE_DAYS).toBe(21)
    expect(cycleDay(0)).toBe(1)
    expect(cycleDay(0.3)).toBe(7)
    expect(cycleDay(1)).toBe(21)
  })

  it('idealRange intersects and flags conflicts', () => {
    expect(idealRange([], 'hum')).toEqual({ lo: 60, hi: 90 })
    expect(idealRange([], 'temp')).toEqual({ lo: 20, hi: 28 })
    expect(idealRange([item('peacock_fern'), item('fittonia')], 'hum')).toEqual({ lo: 65, hi: 92 })
    expect(idealRange([item('echeveria'), item('peacock_fern')], 'hum')).toMatchObject({
      lo: 55,
      hi: 65,
      conflict: true,
      names: { lo: 'Blue Peacock Fern', hi: 'Rosette Succulent' },
    })
  })

  it('humidity too high suggests cracking the lid, else fogger off', () => {
    const [w] = computeCareReport(inputs({ items: [item('tree_frog')], humidity: 90 }))
    expect(w).toEqual({
      level: 'warn',
      species: ['tree_frog'],
      text: 'Red-Eyed Tree Frog prefers 50–85% humidity; the air is at 90%.',
      action: { id: 'openLid', label: 'Crack the lid open' },
    })
    expect(
      computeCareReport(inputs({ items: [item('tree_frog')], humidity: 90, hasLid: false }))[0]
        .action,
    ).toEqual({ id: 'fogOff', label: 'Turn the fogger off' })
  })

  it('humidity too low suggests sealing the lid, else misting', () => {
    expect(
      computeCareReport(inputs({ items: [item('vampire_crab')], humidity: 60, hasLid: false }))[0],
    ).toMatchObject({
      text: 'Vampire Crab needs 75–100% humidity; the air is at 60%.',
      action: { id: 'closeLid', label: 'Seal the lid' },
    })
    expect(
      computeCareReport(inputs({ items: [item('vampire_crab')], humidity: 60 }))[0].action,
    ).toEqual({ id: 'mist', label: 'Mist now' })
  })

  it('temperature warnings', () => {
    const r = computeCareReport(
      inputs({ items: [item('tree_frog')], humidity: 70, temperature: 27.5 }),
    )
    expect(r).toContainEqual({
      level: 'warn',
      species: ['tree_frog'],
      text: "Red-Eyed Tree Frog does best at 20–26 °C; it's 27.5 °C.",
      action: { id: 'openLid', label: 'Vent the heat' },
    })
    expect(
      computeCareReport(inputs({ items: [item('tree_frog')], humidity: 70, temperature: 18 })),
    ).toContainEqual({
      level: 'info',
      species: ['tree_frog'],
      text: "Red-Eyed Tree Frog does best at 20–26 °C; it's 18.0 °C tonight.",
    })
  })

  it('vampire crab predation and pool needs', () => {
    const r = computeCareReport(
      inputs({ items: [item('vampire_crab'), item('medaka_fish'), item('garden_snail')] }),
    )
    expect(r).toContainEqual({
      level: 'warn',
      species: ['vampire_crab', 'medaka_fish', 'garden_snail'],
      text: 'Vampire crabs tend to catch Golden Medaka Fish and Amber Glass Snail. Small shrimp usually coexist; keep the others in another build.',
    })
    expect(
      computeCareReport(inputs({ items: [item('vampire_crab')], waterSplit: 0 })),
    ).toContainEqual({
      level: 'warn',
      species: ['vampire_crab'],
      text: 'Vampire crabs need a pool to molt and drink.',
      action: { id: 'widenPool', label: 'Add a pool' },
    })
  })

  it('aquatic fauna: no water, cycling, pump rules', () => {
    expect(
      computeCareReport(inputs({ items: [item('cherry_shrimp')], waterSplit: 0 })),
    ).toContainEqual({
      level: 'warn',
      species: ['cherry_shrimp'],
      text: 'Fish and shrimp need open water.',
      action: { id: 'widenPool', label: 'Add a pool' },
    })
    expect(
      computeCareReport(inputs({ items: [item('cherry_shrimp')], cycleProgress: 0.3 })),
    ).toContainEqual({
      level: 'info',
      species: ['cherry_shrimp'],
      text: 'The pool is still cycling (day 7 of ~21). Fish and shrimp do best once ammonia and nitrite read 0.',
    })
    expect(
      computeCareReport(inputs({ items: [item('cherry_shrimp')], pumpFlow: 'strong' })),
    ).toContainEqual({
      level: 'warn',
      species: ['tree_frog', 'cherry_shrimp'],
      text: 'Strong flow stresses frogs and shrimp. Keep the waterfall gentle.',
      action: { id: 'pumpGentle', label: 'Set pump to gentle' },
    })
    expect(
      computeCareReport(inputs({ items: [item('medaka_fish')], pumpFlow: 'off' })),
    ).toContainEqual({
      level: 'warn',
      species: ['medaka_fish'],
      text: 'Still water goes stale without the pump.',
      action: { id: 'pumpGentle', label: 'Run the pump' },
    })
  })

  it('tree frog in a small vessel, fogged glass, dry soil, low nutrients', () => {
    expect(
      computeCareReport(inputs({ items: [item('tree_frog')], humidity: 70, vessel: 'globe' })),
    ).toContainEqual({
      level: 'info',
      species: ['tree_frog'],
      text: 'Tree frogs need height to climb. The Paludarium Tank or Zen Cylinder suits them.',
    })
    expect(computeCareReport(inputs({ humidity: 95, condensation: 0.9 }))).toContainEqual({
      level: 'warn',
      text: 'The glass has stayed fogged over. That means too wet; vent it for a while.',
      action: { id: 'openLid', label: 'Crack the lid open' },
    })
    expect(computeCareReport(inputs({ soilMoisture: 40 }))).toContainEqual({
      level: 'warn',
      text: 'The substrate is drying out and the moss looks pale.',
      action: { id: 'mist', label: 'Mist now' },
    })
    expect(computeCareReport(inputs({ nutrients: 30 }))).toContainEqual({
      level: 'info',
      text: 'Nutrients are running low for this many plants.',
      action: { id: 'feed', label: 'Add bio-feed' },
    })
  })

  it('a healthy default build reports no issues', () => {
    expect(computeCareReport(inputs({}))).toEqual([])
  })

  it('runCareAction mutates world env and store and returns the toast', () => {
    const store = createStudioStore(memoryStorage)
    const w = createWorld()
    w.env.mistBoost = 20
    expect(runCareAction(w, store.getState(), 'mist')).toBe('Misted the plants')
    expect(w.env.mistBoost).toBe(25)
    expect(w.env.soilMoisture).toBe(78)
    expect(runCareAction(w, store.getState(), 'openLid')).toBe('Lid cracked open to vent moisture')
    expect(store.getState().hasLid).toBe(false)
    expect(runCareAction(w, store.getState(), 'closeLid')).toBe('Lid sealed; humidity will rise')
    expect(store.getState().hasLid).toBe(true)
    expect(runCareAction(w, store.getState(), 'fogOff')).toBe('Fogger off')
    expect(store.getState().hasFogger).toBe(false)
    store.getState().setPumpFlow('strong')
    expect(runCareAction(w, store.getState(), 'pumpGentle')).toBe('Pump set to gentle flow')
    expect(store.getState().pumpFlow).toBe('gentle')
    w.env.nutrients = 90
    expect(runCareAction(w, store.getState(), 'feed')).toBe('Added organic bio-feed')
    expect(w.env.nutrients).toBe(100)
    store.getState().setWaterSplit(0)
    store.getState().setSubstrate('water', 10)
    expect(runCareAction(w, store.getState(), 'widenPool')).toBe(
      'Added a pool. New water cycles for about 3 weeks.',
    )
    expect(store.getState()).toMatchObject({
      waterSplit: 0.3,
      substrates: expect.objectContaining({ water: 40 }),
      cycleProgress: 0,
    })
    expect(w.env.cycleProgress).toBe(0)
  })
})
