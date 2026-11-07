/** The v6 care report, ideal ranges and one-click care actions (prototype 2907-3020). */
import { findCatalogDef } from '@/data/catalog'
import type { CatalogDef, PlacedItem } from '@/data/types'
import type { StudioState, StudioStore } from '@/store/useStudioStore'
import { poolHasWater } from './geometry'
import type { EngineWorld } from './world'

export type CareActionId =
  'mist' | 'openLid' | 'closeLid' | 'fogOff' | 'pumpGentle' | 'feed' | 'widenPool'

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
  'hasLid' | 'hasFogger' | 'pumpFlow' | 'vessel' | 'waterSplit' | 'substrates'
> & {
  items: readonly PlacedItem[]
  humidity: number
  temperature: number
  soilMoisture: number
  nutrients: number
  condensation: number
  cycleProgress: number
}

const SMALL_VESSELS: readonly string[] = ['globe', 'teardrop', 'apothecary', 'wardian']

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
    const prey = ['medaka_fish', 'garden_snail'].filter(has)
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
  return issues
}

/**
 * Applies a one-click care action and returns the toast text. Engine gauges live on `world.env`;
 * hardware and build settings go through store actions. The UI caller plays the feed chime.
 */
export function runCareAction(world: EngineWorld, store: StudioStore, id: CareActionId): string {
  const env = world.env
  switch (id) {
    case 'mist':
      env.mistBoost = Math.min(25, env.mistBoost + 10)
      env.soilMoisture = Math.min(98, env.soilMoisture + 4)
      return 'Misted the plants'
    case 'openLid':
      store.setHardware('hasLid', false)
      return 'Lid cracked open to vent moisture'
    case 'closeLid':
      store.setHardware('hasLid', true)
      return 'Lid sealed; humidity will rise'
    case 'fogOff':
      store.setHardware('hasFogger', false)
      return 'Fogger off'
    case 'pumpGentle':
      store.setPumpFlow('gentle')
      return 'Pump set to gentle flow'
    case 'feed':
      env.nutrients = Math.min(100, env.nutrients + 15)
      return 'Added organic bio-feed'
    case 'widenPool':
      store.setWaterSplit(0.3)
      store.setSubstrate('water', Math.max(store.substrates.water || 0, 40))
      store.setCycleProgress(0)
      env.cycleProgress = 0
      return 'Added a pool. New water cycles for about 3 weeks.'
  }
}
