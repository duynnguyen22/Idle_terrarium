import { createStore } from 'jotai'
import { describe, expect, it } from 'vitest'
import { findCatalogDef } from '@/data/catalog'
import { DEFAULT_ROOM, envModel } from '@/engine/room'
import { DEFAULT_SUBSTRATES } from '@/data/substrates'
import type { PlacedItem } from '@/data/types'
import {
  computeCareReport,
  cycleChemistry,
  envCareIssues,
  cycleDay,
  CYCLE_DAYS,
  idealRange,
  runCareAction,
  type CareInputs,
} from '@/engine/care'
import { createWorld } from '@/engine/world'
import {
  bindStudioStorage,
  mineralSpotsAtom,
  pumpFlowAtom,
  roomAtom,
  setSubstrateAtom,
  studioStateAtom,
  waterSplitAtom,
} from '@/store/studio'

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

/** A jotai store with its studio atoms bound to the shared in-memory save. */
function makeStudioStore() {
  const store = createStore()
  bindStudioStorage(store, memoryStorage)
  return store
}

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
  room: DEFAULT_ROOM,
  mineralSpots: 0,
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

  it("runCareAction('mist') wakes resting plants and appends the woke toast", () => {
    const store = makeStudioStore()
    const w = createWorld()
    w.items = [
      {
        uid: 'f1',
        id: 'fittonia',
        category: 'flora',
        x: 0.5,
        y: 0.5,
        scale: 1,
        rotation: 0,
        flipX: false,
        zIndex: 1,
        vitality: 60,
        resting: true,
      },
    ]
    expect(runCareAction(w, store, 'mist')).toBe(
      'Misted the plants. The Pink Fittonia woke up and perked up.',
    )
    expect(w.items[0].resting).toBe(false)
    expect(w.items[0].vitality).toBe(68)
  })

  it('runCareAction mutates world env and store and returns the toast', () => {
    const store = makeStudioStore()
    const w = createWorld()
    w.env.mistBoost = 20
    expect(runCareAction(w, store, 'mist')).toBe('Misted the plants')
    expect(w.env.mistBoost).toBe(25)
    expect(w.env.soilMoisture).toBe(78)
    expect(runCareAction(w, store, 'openLid')).toBe('Lid cracked open to vent moisture')
    expect(store.get(studioStateAtom).hasLid).toBe(false)
    expect(runCareAction(w, store, 'closeLid')).toBe('Lid sealed; humidity will rise')
    expect(store.get(studioStateAtom).hasLid).toBe(true)
    expect(runCareAction(w, store, 'fogOff')).toBe('Fogger off')
    expect(store.get(studioStateAtom).hasFogger).toBe(false)
    store.set(pumpFlowAtom, 'strong')
    expect(runCareAction(w, store, 'pumpGentle')).toBe('Pump set to gentle flow')
    expect(store.get(studioStateAtom).pumpFlow).toBe('gentle')
    w.env.nutrients = 90
    expect(runCareAction(w, store, 'feed')).toBe('Added organic bio-feed')
    expect(w.env.nutrients).toBe(100)
    store.set(waterSplitAtom, 0)
    store.set(setSubstrateAtom, 'water', 10)
    expect(runCareAction(w, store, 'widenPool')).toBe(
      'Added a pool. New water cycles for about 3 weeks.',
    )
    expect(store.get(studioStateAtom)).toMatchObject({
      waterSplit: 0.3,
      substrates: expect.objectContaining({ water: 40 }),
      cycleProgress: 0,
    })
    expect(w.env.cycleProgress).toBe(0)
  })
})

describe('room care issues', () => {
  const room = (over: Partial<typeof DEFAULT_ROOM>) => ({ ...DEFAULT_ROOM, ...over })
  const nameOf = (id: string) => findCatalogDef(id)!.name

  it('untreated tap water warns and names the sensitive animals', () => {
    const issues = computeCareReport(
      inputs({
        room: room({ water: 'tap' }),
        items: [item('cherry_shrimp'), item('tree_frog')],
      }),
    )
    expect(issues).toContainEqual({
      level: 'warn',
      text: `Untreated tap water carries chlorine, which harms ${nameOf('cherry_shrimp')}, ${nameOf('tree_frog')}.`,
      action: { id: 'waterTreat', label: 'Add dechlorinator' },
    })
  })

  it('without animals the chlorine warning says it burns moss tips', () => {
    const issues = computeCareReport(inputs({ room: room({ water: 'tap' }) }))
    expect(issues).toContainEqual({
      level: 'warn',
      text: 'Untreated tap water carries chlorine that burns moss tips.',
      action: { id: 'waterTreat', label: 'Add dechlorinator' },
    })
  })

  it('carbon-filtered water only nags shrimp keepers', () => {
    const filtered = room({ water: 'filtered' })
    expect(computeCareReport(inputs({ room: filtered }))).toEqual([])
    expect(
      computeCareReport(inputs({ room: filtered, items: [item('cherry_shrimp')] })),
    ).toContainEqual({
      level: 'info',
      text: 'Carbon filters leave some chloramine. Shrimp are sensitive; a dechlorinator removes the rest.',
      action: { id: 'waterTreat', label: 'Use dechlorinator' },
    })
  })

  it('hard water above 350 ppm warns with the ppm value', () => {
    expect(computeCareReport(inputs({ room: room({ tds: 400 }) }))).toContainEqual({
      level: 'warn',
      text: 'Hard water (400 ppm) leaves white mineral crust on leaves and glass. Mist with RO or rainwater.',
      action: { id: 'waterRO', label: 'Switch to RO water' },
    })
  })

  it('soft water, far-from-neutral pH and polluted rain are flagged', () => {
    expect(
      computeCareReport(inputs({ room: room({ tds: 50 }), items: [item('garden_snail')] })),
    ).toContainEqual({
      level: 'info',
      text: 'Water this soft (50 ppm) lacks the calcium shrimp and snails need for shells. Remineralise to 150–250 ppm.',
    })
    expect(computeCareReport(inputs({ room: room({ ph: 8.4 }) }))).toContainEqual({
      level: 'warn',
      text: 'pH 8.4 is far from neutral. Most of these species do best between 6.5 and 7.5.',
    })
    expect(
      computeCareReport(inputs({ room: room({ water: 'rain', air: 'smoke' }) })),
    ).toContainEqual({
      level: 'info',
      text: 'Rain collected in polluted air picks up soot and acids. Use RO water until the air clears.',
    })
  })

  it('aerosol air warns and offers to move the tank', () => {
    expect(
      computeCareReport(
        inputs({ room: room({ air: 'aerosol' }), items: [item('isopod'), item('springtails')] }),
      ),
    ).toContainEqual({
      level: 'warn',
      text: `Insecticide and fragrance sprays kill invertebrates like ${nameOf('isopod')}, ${nameOf('springtails')}. Keep sprays out of this room.`,
      action: { id: 'airClean', label: 'Move the tank' },
    })
  })

  it('fumes offer the lid only when it is open', () => {
    const open = computeCareReport(inputs({ room: room({ air: 'voc' }), hasLid: false }))
    expect(open).toContainEqual({
      level: 'warn',
      text: 'Paint and new-furniture fumes stress plants and animals. Ventilate the room and keep the lid sealed.',
      action: { id: 'closeLid', label: 'Seal the lid' },
    })
    const sealed = computeCareReport(
      inputs({ room: room({ air: 'voc' }), items: [item('tree_frog')], humidity: 70 }),
    ).find((i) => i.text.startsWith('Paint'))
    expect(sealed?.text).toContain('pass through frog skin')
    expect(sealed?.action).toBeUndefined()
  })

  it('particles with lid open offer the purifier, then the lid', () => {
    const text = 'Dust and soot settle on leaves and slow photosynthesis.'
    const find = (over: Partial<CareInputs>) =>
      computeCareReport(inputs(over)).find((i) => i.text === text)
    expect(find({ room: room({ air: 'traffic' }), hasLid: false })?.action).toEqual({
      id: 'purifierOn',
      label: 'Run the air purifier',
    })
    // A purifier lifts smoke to exactly 70 with the lid open, so the model never flags it; probe the
    // purifier-on branches with a hand-built reading.
    const purified = room({ air: 'smoke', purifier: true })
    const m = { ...envModel(purified, false), airEff: 65 }
    const run = (hasLid: boolean) =>
      envCareIssues(m, purified, hasLid, 0, () => false).find((i) => i.text === text)
    expect(run(false)?.action).toEqual({ id: 'closeLid', label: 'Seal the lid' })
    expect(run(true)).toBeDefined()
    expect(run(true)?.action).toBeUndefined()
  })

  it('mineral spots above 0.35 offer a wipe', () => {
    expect(computeCareReport(inputs({ mineralSpots: 0.35 }))).toEqual([])
    expect(computeCareReport(inputs({ mineralSpots: 0.4 }))).toContainEqual({
      level: 'info',
      text: 'Mineral spots are clouding the glass.',
      action: { id: 'wipeGlass', label: 'Wipe the glass' },
    })
  })

  it('runCareAction room branches write through the store and return the toasts', () => {
    const store = makeStudioStore()
    const w = createWorld()
    store.set(roomAtom, { water: 'tap' })
    expect(runCareAction(w, store, 'waterTreat')).toBe('Water is now dechlorinated')
    expect(store.get(studioStateAtom).room.water).toBe('tap_treated')
    expect(runCareAction(w, store, 'waterRO')).toBe('Misting with RO water now')
    expect(store.get(studioStateAtom).room.water).toBe('ro')
    store.set(roomAtom, { air: 'aerosol' })
    expect(runCareAction(w, store, 'airClean')).toBe('Tank moved to a room with clean air')
    expect(store.get(studioStateAtom).room.air).toBe('clean')
    expect(runCareAction(w, store, 'purifierOn')).toBe('Air purifier on')
    expect(store.get(studioStateAtom).room.purifier).toBe(true)
    store.set(mineralSpotsAtom, 0.6)
    w.mineralSpots = 0.6
    expect(runCareAction(w, store, 'wipeGlass')).toBe('Glass wiped clean')
    expect(store.get(studioStateAtom).mineralSpots).toBe(0)
    expect(w.mineralSpots).toBe(0)
  })
})
