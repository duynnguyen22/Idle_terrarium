/** The v6 care report: the ordered list of issues the Botanist's Notes show (prototype 2907-3020). */
import { findCatalogDef } from '@/data/catalog'
import type { CareIssue } from '@/data/care'
import { poolHasWater } from '../geometry'
import { envModel } from '../room'
import { CYCLE_DAYS, cycleDay } from './cycle'
import { envCareIssues } from './envIssues'
import { faunaMixIssues } from './faunaMix'
import type { CareInputs } from './inputs'
import { humRange, tempRange } from './ranges'

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
  climateIssues(issues, s, h, t)

  // Predation and tankmates
  tankmateIssues(issues, s, has, water)

  // Moisture, glass and food
  moistureIssues(issues, s)
  const model = envModel(s.room, s.hasLid)
  issues.push(...faunaMixIssues(s, has, water, model))
  issues.push(...envCareIssues(model, s.room, s.hasLid, s.mineralSpots, has))
  return issues
}

/** Humidity and temperature against each species' ideal range, once per species in placement order. */
function climateIssues(issues: CareIssue[], s: CareInputs, h: number, t: number): void {
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
}

/** Predation, the pool the swimmers need, pump flow and vessel height. */
function tankmateIssues(
  issues: CareIssue[],
  s: CareInputs,
  has: (id: string) => boolean,
  water: boolean,
): void {
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
}

/** Fogged glass, dry substrate and low nutrients. */
function moistureIssues(issues: CareIssue[], s: CareInputs): void {
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
}
