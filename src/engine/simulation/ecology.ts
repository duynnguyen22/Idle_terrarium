import { findCatalogDef } from '@/data/catalog'
import type { FaunaDef, FloraDef, PlacedItem } from '@/data/types'
import { clamp } from '@/lib/clamp'
import { cycleChemistry } from '../care'
import type { EngineWorld, EnvState } from '../world'
import type { Emit } from './life'

/** Vitality floor of a resting plant. */
export const REST_FLOOR = 55

const clamp01 = (n: number): number => clamp(n, 0, 1)

/** Distance of `value` outside the closed band `[lo, hi]` (0 inside it). */
function outside(value: number, band: readonly [number, number] | undefined): number {
  if (!band) return 0
  return Math.max(0, band[0] - value, value - band[1])
}

/** Humidity stress (0..1 over 20 points outside the band) plus 0.3 when nutrients run low, capped at 1. */
export function plantStress(def: FloraDef, env: EnvState): number {
  const humidity = clamp01(outside(env.humidity, def.idealHumidity) / 20)
  return Math.min(1, humidity + (env.nutrients < 20 ? 0.3 : 0))
}

/** Humidity stress plus temperature distance outside the band over 6 degrees, capped at 1. A missing band adds nothing. */
export function faunaStress(def: FaunaDef, env: EnvState): number {
  const humidity = clamp01(outside(env.humidity, def.idealHumidity) / 20)
  const temperature = clamp01(outside(env.temperature, def.idealTemp) / 6)
  return Math.min(1, humidity + temperature)
}

/** Stress of a placed item; 0 for hardscape and unknown ids. */
export function itemStress(item: PlacedItem, env: EnvState): number {
  const def = findCatalogDef(item.id)
  if (!def) return 0
  if (def.category === 'flora') return plantStress(def, env)
  if (def.category === 'fauna') return faunaStress(def, env)
  return 0
}

/** Pool health 0..100: 100 once cycled, dragged down by ammonia and nitrite mid-cycle. */
export function poolScore(cycleProgress: number): number {
  const { nh3, no2 } = cycleChemistry(cycleProgress)
  return clamp(100 - 20 * nh3 - 20 * no2, 0, 100)
}

/**
 * One tank day of plant ecology: vitality eases toward `max(4, 100 * (1 - stress))` (fast down, slow up), stressed
 * plants rest while the person is away, `lush` charges while thriving, and scale and stage follow vitality.
 * Fauna, hardscape and babies are skipped.
 */
export function ecologyStep(
  world: EngineWorld,
  dtDay: number,
  opts: { away: boolean },
  emit?: Emit,
): void {
  for (const item of world.items) {
    if (item.category !== 'flora' || item.baby !== undefined) continue
    const def = findCatalogDef(item.id)
    if (!def || def.category !== 'flora') continue

    const v0 = item.vitality ?? 100
    const target = Math.max(4, 100 * (1 - plantStress(def, world.env)))
    const rate = target < v0 ? 1.1 : 0.32
    let v = clamp(v0 + (target - v0) * Math.min(1, rate * dtDay), 3, 100)

    if (opts.away && target < 62 && !item.resting) {
      item.resting = true
      emit?.({ kind: 'rest', uid: item.uid, id: item.id })
    }
    if (item.resting) {
      v = Math.max(v, REST_FLOOR)
      if (target > 75 && v > 75) item.resting = false
    }
    item.vitality = v

    item.lush = clamp((item.lush ?? 0) + (v > 85 ? 0.25 : -0.6) * dtDay, 0, 1)

    const sprouting = item.stage === 'sprout' && (item.growthProgress ?? 0) < 1
    if (!sprouting) {
      const base = def.baseScale
      if (v > 68 && item.scale < base * 1.35) {
        item.scale = Math.min(base * 1.35, item.scale + ((v - 68) / 32) * 0.045 * dtDay)
      } else if (v < 32 && item.scale > base * 0.62) {
        item.scale = Math.max(base * 0.62, item.scale * (1 - 0.012 * dtDay))
      }
      item.stage = item.lush > 0.75 && v > 85 ? 'lush' : 'mature'
    }
  }
}

/** Wakes every resting plant (+8 vitality) and returns the species names, once each, in item order. */
export function wakeResting(world: EngineWorld): string[] {
  const names: string[] = []
  for (const item of world.items) {
    if (!item.resting) continue
    item.resting = false
    item.vitality = Math.min(100, (item.vitality ?? 100) + 8)
    const name = findCatalogDef(item.id)?.name ?? item.id
    if (!names.includes(name)) names.push(name)
  }
  return names
}

export function wokeToast(names: string[]): string {
  return `The ${names.join(', ')} woke up and perked up.`
}
