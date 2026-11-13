/** The v6 care report, ideal ranges and one-click care actions (prototype 2907-3020). */
import { findCatalogDef } from '@/data/catalog'
import type { CatalogDef, PlacedItem, RoomEnv } from '@/data/types'
import type { Store } from 'jotai'
import {
  cycleProgressAtom,
  hardwareAtoms,
  mineralSpotsAtom,
  pumpFlowAtom,
  roomAtom,
  setSubstrateAtom,
  substratesAtom,
  waterSplitAtom,
  type StudioState,
} from '@/store/studio'
import { poolHasWater } from './geometry'
import { wakeResting, wokeToast } from './simulation/ecology'
import { envModel, type EnvModel } from './room'
import type { EngineWorld } from './world'

export type CareActionId =
  | 'mist'
  | 'openLid'
  | 'closeLid'
  | 'fogOff'
  | 'pumpGentle'
  | 'feed'
  | 'widenPool'
  | 'waterTreat'
  | 'waterRO'
  | 'airClean'
  | 'purifierOn'
  | 'wipeGlass'

export interface CareIssue {
  level: 'warn' | 'info'
  species?: string[]
  text: string
  action?: { id: CareActionId; label: string }
}

export const CYCLE_DAYS = 21

/** Ammonia / nitrite readings (ppm) while the pool cycles; both 0 once cycled. */
export function cycleChemistry(p: number): { nh3: number; no2: number } {
  if (p >= 1) return { nh3: 0, no2: 0 }
  return {
    nh3: 3.5 * Math.exp(-Math.pow((p - 0.3) / 0.18, 2)),
    no2: 2.5 * Math.exp(-Math.pow((p - 0.62) / 0.15, 2)),
  }
}

export function cycleDay(p: number): number {
  return Math.max(1, Math.ceil(p * CYCLE_DAYS))
}

function humRange(d: CatalogDef | null): readonly [number, number] | undefined {
  return d && d.category !== 'hardscape' ? d.idealHumidity : undefined
}

function tempRange(d: CatalogDef | null): readonly [number, number] | undefined {
  return d && d.category === 'fauna' ? d.idealTemp : undefined
}

export interface IdealRange {
  lo: number
  hi: number
  conflict?: boolean
  names?: { lo: string; hi: string }
}

/** Intersection of every placed species' ideal range; flags a conflict when they don't overlap. */
export function idealRange(items: readonly PlacedItem[], key: 'hum' | 'temp'): IdealRange {
  let lo = -Infinity
  let hi = Infinity
  let any = false
  const names = { lo: '', hi: '' }
  for (const it of items) {
    const d = findCatalogDef(it.id)
    const r = key === 'hum' ? humRange(d) : tempRange(d)
    if (!d || !r) continue
    any = true
    if (r[0] > lo) {
      lo = r[0]
      names.lo = d.name
    }
    if (r[1] < hi) {
      hi = r[1]
      names.hi = d.name
    }
  }
  if (!any) return key === 'hum' ? { lo: 60, hi: 90 } : { lo: 20, hi: 28 }
  if (lo > hi) return { lo: hi, hi: lo, conflict: true, names }
  return { lo, hi }
}

export type CareInputs = Pick<
  StudioState,
  'hasLid' | 'hasFogger' | 'pumpFlow' | 'vessel' | 'waterSplit' | 'substrates' | 'room'
> & {
  items: readonly PlacedItem[]
  humidity: number
  temperature: number
  soilMoisture: number
  nutrients: number
  condensation: number
  cycleProgress: number
  /** Hard-water residue on the glass, 0 to 1 (lives on the engine world). */
  mineralSpots: number
}

const SMALL_VESSELS: readonly string[] = ['globe', 'teardrop', 'apothecary', 'wardian']

/** Water chemistry, air quality and glass residue issues from the room (prototype 3898-3921). */
export function envCareIssues(
  m: EnvModel,
  room: RoomEnv,
  hasLid: boolean,
  mineralSpots: number,
  has: (id: string) => boolean,
): CareIssue[] {
  const out: CareIssue[] = []
  const names = (ids: string[]) => ids.filter(has).map((i) => findCatalogDef(i)?.name ?? i)
  if (m.chlorine >= 0.9) {
    const hit = names([
      'cherry_shrimp',
      'medaka_fish',
      'tree_frog',
      'vampire_crab',
      'amano_shrimp',
      'phantasmal_dart',
      'nerite_snail',
    ])
    out.push({
      level: 'warn',
      text: `Untreated tap water carries chlorine${hit.length ? `, which harms ${hit.join(', ')}` : ' that burns moss tips'}.`,
      action: { id: 'waterTreat', label: 'Add dechlorinator' },
    })
  } else if (m.chlorine > 0 && has('cherry_shrimp')) {
    out.push({
      level: 'info',
      text: 'Carbon filters leave some chloramine. Shrimp are sensitive; a dechlorinator removes the rest.',
      action: { id: 'waterTreat', label: 'Use dechlorinator' },
    })
  }
  if (m.tds > 350) {
    out.push({
      level: 'warn',
      text: `Hard water (${m.tds} ppm) leaves white mineral crust on leaves and glass. Mist with RO or rainwater.`,
      action: { id: 'waterRO', label: 'Switch to RO water' },
    })
  }
  if (m.tds < 80 && (has('cherry_shrimp') || has('garden_snail'))) {
    out.push({
      level: 'info',
      text: `Water this soft (${m.tds} ppm) lacks the calcium shrimp and snails need for shells. Remineralise to 150–250 ppm.`,
    })
  }
  if (Math.abs(m.ph - 7) > 1) {
    out.push({
      level: 'warn',
      text: `pH ${m.ph.toFixed(1)} is far from neutral. Most of these species do best between 6.5 and 7.5.`,
    })
  }
  if (room.water === 'rain' && m.airRaw < 60) {
    out.push({
      level: 'info',
      text: 'Rain collected in polluted air picks up soot and acids. Use RO water until the air clears.',
    })
  }
  if (m.kind === 'toxic') {
    const inv = names([
      'isopod',
      'ducky_isopod',
      'springtails',
      'cherry_shrimp',
      'garden_snail',
      'vampire_crab',
      'powder_orange',
      'dwarf_white',
      'bumblebee_millipede',
      'amano_shrimp',
    ])
    out.push({
      level: 'warn',
      text: `Insecticide and fragrance sprays kill invertebrates${inv.length ? ` like ${inv.join(', ')}` : ''}. Keep sprays out of this room.`,
      action: { id: 'airClean', label: 'Move the tank' },
    })
  } else if (m.kind === 'fumes') {
    out.push({
      level: 'warn',
      text: `Paint and new-furniture fumes${has('tree_frog') ? ' pass through frog skin' : ' stress plants and animals'}. Ventilate the room and keep the lid sealed.`,
      ...(hasLid ? {} : { action: { id: 'closeLid', label: 'Seal the lid' } }),
    })
  } else if (m.kind === 'particles' && m.airEff < 70) {
    const action: CareIssue['action'] = room.purifier
      ? hasLid
        ? undefined
        : { id: 'closeLid', label: 'Seal the lid' }
      : { id: 'purifierOn', label: 'Run the air purifier' }
    out.push({
      level: 'info',
      text: 'Dust and soot settle on leaves and slow photosynthesis.',
      ...(action ? { action } : {}),
    })
  }
  if (mineralSpots > 0.35) {
    out.push({
      level: 'info',
      text: 'Mineral spots are clouding the glass.',
      action: { id: 'wipeGlass', label: 'Wipe the glass' },
    })
  }
  return out
}

/** Builds a fresh issue list each call (callers assign it; the telemetry store compares it by content). */
export function computeCareReport(s: CareInputs): CareIssue[] {
  const issues: CareIssue[] = []
  const present = new Set(s.items.map((i) => i.id))
  const has = (id: string) => present.has(id)
  const water = poolHasWater(s)
  const h = Math.round(s.humidity)
  const t = s.temperature

  // Humidity and temperature, grouped by species
  const seen = new Set<string>()
  for (const it of s.items) {
    const d = findCatalogDef(it.id)
    const hum = humRange(d)
    if (!d || seen.has(d.id) || !hum) continue
    seen.add(d.id)
    const [lo, hi] = hum
    if (h > hi + 3) {
      const action: CareIssue['action'] = s.hasLid
        ? { id: 'openLid', label: 'Crack the lid open' }
        : s.hasFogger
          ? { id: 'fogOff', label: 'Turn the fogger off' }
          : undefined
      issues.push({
        level: 'warn',
        species: [d.id],
        text: `${d.name} prefers ${lo}–${hi}% humidity; the air is at ${h}%.`,
        ...(action ? { action } : {}),
      })
    } else if (h < lo - 3) {
      issues.push({
        level: 'warn',
        species: [d.id],
        text: `${d.name} needs ${lo}–${hi}% humidity; the air is at ${h}%.`,
        action: !s.hasLid
          ? { id: 'closeLid', label: 'Seal the lid' }
          : { id: 'mist', label: 'Mist now' },
      })
    }
    const temp = tempRange(d)
    if (temp) {
      const [tlo, thi] = temp
      if (t > thi + 1) {
        issues.push({
          level: 'warn',
          species: [d.id],
          text: `${d.name} does best at ${tlo}–${thi} °C; it's ${t.toFixed(1)} °C.`,
          action: { id: 'openLid', label: 'Vent the heat' },
        })
      }
      if (t < tlo - 1) {
        issues.push({
          level: 'info',
          species: [d.id],
          text: `${d.name} does best at ${tlo}–${thi} °C; it's ${t.toFixed(1)} °C tonight.`,
        })
      }
    }
  }

  // Predation and tankmates
  if (has('vampire_crab')) {
    const prey = ['medaka_fish', 'garden_snail', 'ramshorn_snail'].filter(has)
    if (prey.length) {
      const names = prey.map((p) => findCatalogDef(p)?.name ?? p).join(' and ')
      issues.push({
        level: 'warn',
        species: ['vampire_crab', ...prey],
        text: `Vampire crabs tend to catch ${names}. Small shrimp usually coexist; keep the others in another build.`,
      })
    }
    if (!water) {
      issues.push({
        level: 'warn',
        species: ['vampire_crab'],
        text: 'Vampire crabs need a pool to molt and drink.',
        action: { id: 'widenPool', label: 'Add a pool' },
      })
    }
  }
  const aquatic = s.items.filter((i) => {
    const d = findCatalogDef(i.id)
    return d?.category === 'fauna' && !!d.aquatic
  })
  if (aquatic.length && !water) {
    issues.push({
      level: 'warn',
      species: aquatic.map((a) => a.id),
      text: 'Fish and shrimp need open water.',
      action: { id: 'widenPool', label: 'Add a pool' },
    })
  } else if (aquatic.length && s.cycleProgress < 1) {
    issues.push({
      level: 'info',
      species: aquatic.map((a) => a.id),
      text: `The pool is still cycling (day ${cycleDay(s.cycleProgress)} of ~${CYCLE_DAYS}). Fish and shrimp do best once ammonia and nitrite read 0.`,
    })
  }
  if (s.pumpFlow === 'strong' && (has('tree_frog') || has('cherry_shrimp'))) {
    issues.push({
      level: 'warn',
      species: ['tree_frog', 'cherry_shrimp'],
      text: 'Strong flow stresses frogs and shrimp. Keep the waterfall gentle.',
      action: { id: 'pumpGentle', label: 'Set pump to gentle' },
    })
  }
  if (s.pumpFlow === 'off' && water && aquatic.length) {
    issues.push({
      level: 'warn',
      species: aquatic.map((a) => a.id),
      text: 'Still water goes stale without the pump.',
      action: { id: 'pumpGentle', label: 'Run the pump' },
    })
  }
  if (has('tree_frog') && SMALL_VESSELS.includes(s.vessel)) {
    issues.push({
      level: 'info',
      species: ['tree_frog'],
      text: 'Tree frogs need height to climb. The Paludarium Tank or Zen Cylinder suits them.',
    })
  }

  // Moisture, glass and food
  if (s.hasLid && s.humidity > 93 && s.condensation > 0.8) {
    issues.push({
      level: 'warn',
      text: 'The glass has stayed fogged over. That means too wet; vent it for a while.',
      action: { id: 'openLid', label: 'Crack the lid open' },
    })
  }
  if (s.soilMoisture < 45) {
    issues.push({
      level: 'warn',
      text: 'The substrate is drying out and the moss looks pale.',
      action: { id: 'mist', label: 'Mist now' },
    })
  }
  if (s.nutrients < 40) {
    issues.push({
      level: 'info',
      text: 'Nutrients are running low for this many plants.',
      action: { id: 'feed', label: 'Add bio-feed' },
    })
  }
  const model = envModel(s.room, s.hasLid)
  issues.push(...faunaMixIssues(s, has, water, model))
  issues.push(...envCareIssues(model, s.room, s.hasLid, s.mineralSpots, has))
  return issues
}

/** Tankmate rules for the research species, taken from keepers' care sheets (prototype v8 faunaMixIssues). */
function faunaMixIssues(
  s: CareInputs,
  has: (id: string) => boolean,
  water: boolean,
  m: EnvModel,
): CareIssue[] {
  const out: CareIssue[] = []
  const count = (id: string) => s.items.filter((i) => i.id === id).length
  if (has('phantasmal_dart')) {
    if (!has('springtails') && !has('dwarf_white')) {
      out.push({
        level: 'warn',
        species: ['phantasmal_dart'],
        text: 'Dart frogs snack on springtails and dwarf white isopods between feedings. Add a colony so they can forage.',
      })
    } else if (count('springtails') + count('dwarf_white') <= 2) {
      out.push({
        level: 'info',
        species: ['phantasmal_dart', 'springtails', 'dwarf_white'],
        text: 'The dart frogs are eating the springtails faster than they breed. Add another culture.',
      })
    }
    if (has('tree_frog')) {
      out.push({
        level: 'info',
        species: ['phantasmal_dart', 'tree_frog'],
        text: 'Dart frogs and red-eyed tree frogs are not a proven pairing. Watch for stress, or keep them in separate builds.',
      })
    }
    if (!water) {
      out.push({
        level: 'info',
        species: ['phantasmal_dart'],
        text: 'Male dart frogs carry their tadpoles to water. Without a pool there will be no froglets.',
        action: { id: 'widenPool', label: 'Add a pool' },
      })
    }
  }
  if (count('mourning_gecko') === 1) {
    out.push({
      level: 'info',
      species: ['mourning_gecko'],
      text: 'Mourning geckos live in groups. A single one stays shy; add a second.',
    })
  }
  if (has('nerite_snail')) {
    if (!s.hasLid) {
      out.push({
        level: 'warn',
        species: ['nerite_snail'],
        text: 'Nerite snails climb out at the waterline and dry out. Seal the lid.',
        action: { id: 'closeLid', label: 'Seal the lid' },
      })
    }
    if (m.ph < 7 || m.tds < 120) {
      out.push({
        level: 'warn',
        species: ['nerite_snail'],
        text: `Soft or acidic water (pH ${m.ph.toFixed(1)}, ${m.tds} ppm) wears holes in nerite shells. They need pH above 7 and harder water.`,
      })
    }
  }
  if (has('amano_shrimp') && has('cherry_shrimp')) {
    out.push({
      level: 'info',
      species: ['amano_shrimp', 'cherry_shrimp'],
      text: 'Amano shrimp grab the food first. Scatter the pinch so the cherry shrimp get some.',
    })
  }
  if (has('bumblebee_millipede') && s.humidity < 70) {
    out.push({
      level: 'warn',
      species: ['bumblebee_millipede'],
      text: 'The air is too dry for the millipedes, so they are nibbling the ferns.',
      action: { id: 'mist', label: 'Mist now' },
    })
  }
  if (has('powder_orange') && has('isopod')) {
    out.push({
      level: 'info',
      species: ['powder_orange', 'isopod'],
      text: 'Powder orange and dairy cow isopods compete for the same leaf litter. Over time one will outnumber the other.',
    })
  }
  return out
}

/**
 * Applies a one-click care action and returns the toast text. Engine gauges live on `world.env`;
 * hardware and build settings are written to the studio atoms in `store`. The UI caller plays the feed chime.
 */
export function runCareAction(world: EngineWorld, store: Store, id: CareActionId): string {
  const env = world.env
  switch (id) {
    case 'mist': {
      env.mistBoost = Math.min(25, env.mistBoost + 10)
      env.soilMoisture = Math.min(98, env.soilMoisture + 4)
      const woke = wakeResting(world)
      return woke.length ? `Misted the plants. ${wokeToast(woke)}` : 'Misted the plants'
    }
    case 'openLid':
      store.set(hardwareAtoms.hasLid, false)
      return 'Lid cracked open to vent moisture'
    case 'closeLid':
      store.set(hardwareAtoms.hasLid, true)
      return 'Lid sealed; humidity will rise'
    case 'fogOff':
      store.set(hardwareAtoms.hasFogger, false)
      return 'Fogger off'
    case 'pumpGentle':
      store.set(pumpFlowAtom, 'gentle')
      return 'Pump set to gentle flow'
    case 'feed':
      env.nutrients = Math.min(100, env.nutrients + 15)
      return 'Added organic bio-feed'
    case 'widenPool': {
      // Substrates are read before the writes (the old store snapshot); setWaterSplit does not touch them.
      const water = store.get(substratesAtom).water
      store.set(waterSplitAtom, 0.3)
      store.set(setSubstrateAtom, 'water', Math.max(water || 0, 40))
      store.set(cycleProgressAtom, 0)
      env.cycleProgress = 0
      return 'Added a pool. New water cycles for about 3 weeks.'
    }
    case 'waterTreat':
      store.set(roomAtom, { water: 'tap_treated' })
      return 'Water is now dechlorinated'
    case 'waterRO':
      store.set(roomAtom, { water: 'ro' })
      return 'Misting with RO water now'
    case 'airClean':
      store.set(roomAtom, { air: 'clean' })
      return 'Tank moved to a room with clean air'
    case 'purifierOn':
      store.set(roomAtom, { purifier: true })
      return 'Air purifier on'
    case 'wipeGlass':
      // The engine owns the live value; zero both so the next flush does not restore the old spots.
      world.mineralSpots = 0
      store.set(mineralSpotsAtom, 0)
      return 'Glass wiped clean'
  }
}
