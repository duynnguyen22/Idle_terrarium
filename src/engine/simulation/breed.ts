import type { PlacedItem } from '@/data/types'
import { poolHasWater } from '@/engine/geometry'
import type { Rng } from '@/lib/rng'
import { createItemId } from '@/lib/ids'
import type { StudioState } from '@/store/studio'
import type { EngineWorld } from '../world'
import { itemStress, poolScore } from './ecology'
import type { Emit } from './life'

export interface BreedConditions {
  nutrients: number
  soilMoisture: number
  humidity: number
  leaflitter: number
  poolHasWater: boolean
  cycleProgress: number
  poolScore: number
}

export interface BreedDef {
  /** Tank days of good conditions per newborn. */
  days: number
  /** Most individuals of the species, babies included. */
  cap: number
  /** Short "needs" phrase for what is missing, or null when the conditions are met. */
  needs: (c: BreedConditions) => string | null
}

export const BREED: Readonly<Partial<Record<string, BreedDef>>> = {
  springtails: {
    days: 4,
    cap: 6,
    needs: (c) => (c.nutrients > 30 && c.soilMoisture > 55 ? null : 'richer, damper soil'),
  },
  isopod: {
    days: 6,
    cap: 5,
    needs: (c) => (c.leaflitter > 1 && c.soilMoisture > 50 ? null : 'damp leaf litter'),
  },
  ducky_isopod: {
    days: 7,
    cap: 5,
    needs: (c) => (c.leaflitter > 1 && c.soilMoisture > 50 ? null : 'damp leaf litter'),
  },
  cherry_shrimp: {
    days: 6,
    cap: 6,
    needs: (c) =>
      c.poolHasWater && c.cycleProgress >= 1 && c.poolScore > 60 ? null : 'a cycled pool',
  },
  garden_snail: {
    days: 9,
    cap: 3,
    needs: (c) => (c.humidity > 60 ? null : 'more humidity'),
  },
}

/** Newborn size as a fraction of adult size, and tank days a baby takes to grow up. */
const BABY_SCALE = 0.55
const BABY_DAYS = 3
/** Progress is held just below one birth when the species is at its cap. */
const PROGRESS_CEILING = 0.999

export function breedConditions(
  world: EngineWorld,
  state: Pick<StudioState, 'substrates' | 'waterSplit'>,
): BreedConditions {
  const { env } = world
  return {
    nutrients: env.nutrients,
    soilMoisture: env.soilMoisture,
    humidity: env.humidity,
    leaflitter: state.substrates.leaflitter ?? 0,
    poolHasWater: poolHasWater({ substrates: state.substrates, waterSplit: state.waterSplit }),
    cycleProgress: env.cycleProgress,
    poolScore: poolScore(env.cycleProgress),
  }
}

/**
 * Adds a newborn beside `adult`. `scale` keeps the adult's size (babyScale shrinks it while `baby` < 1), so growing
 * up only deletes the field.
 */
export function spawnBaby(world: EngineWorld, adult: PlacedItem, rng: Rng): PlacedItem {
  const baby: PlacedItem = {
    ...adult,
    uid: createItemId(),
    baby: 0,
    x: adult.x + (rng() - 0.5) * 0.04,
    zIndex: world.items.length + 1,
  }
  // A newborn starts fresh: no motion/AI state, placement offsets, plant life or shared `life` reference.
  delete baby.vx
  delete baby.vy
  delete baby.aiState
  delete baby.aiTimer
  delete baby.parentUid
  delete baby.offsetX
  delete baby.offsetY
  delete baby.life
  delete baby.resting
  delete baby.lush
  world.items.push(baby)
  return baby
}

/** Render scale: babies run from 0.55 to 1 of the adult scale as `baby` goes 0 to 1. */
export function babyScale(item: PlacedItem, adultScale: number): number {
  if (item.baby === undefined) return adultScale
  return adultScale * (BABY_SCALE + (1 - BABY_SCALE) * Math.min(1, item.baby))
}

/**
 * One tank-day step of fauna breeding: babies grow up (`baby += dt / 3`, field removed at 1), then each species in
 * BREED gains progress `dt / days` while it has an adult, mean adult stress < 0.4, its needs are met and it is
 * under cap. Each whole unit of progress spawns a baby and emits `hatch`; progress is held when conditions fail.
 */
export function breedStep(
  world: EngineWorld,
  dtDay: number,
  rng: Rng,
  emit: Emit,
  cond: BreedConditions,
): void {
  for (const item of world.items) {
    if (item.baby === undefined) continue
    item.baby += dtDay / BABY_DAYS
    if (item.baby >= 1) delete item.baby
  }

  for (const [id, def] of Object.entries(BREED)) {
    if (!def) continue
    const adults: PlacedItem[] = []
    let count = 0
    for (const item of world.items) {
      if (item.id !== id) continue
      count++
      if (item.baby === undefined) adults.push(item)
    }
    if (adults.length === 0 || count >= def.cap) continue
    if (def.needs(cond) !== null) continue
    let stress = 0
    for (const a of adults) stress += itemStress(a, world.env)
    if (stress / adults.length >= 0.4) continue

    let progress = (world.breed[id] ?? 0) + dtDay / def.days
    while (progress >= 1) {
      if (count >= def.cap) {
        progress = Math.min(progress, PROGRESS_CEILING)
        break
      }
      const parent = adults[Math.min(adults.length - 1, Math.floor(rng() * adults.length))]
      if (!parent) break
      progress -= 1
      const baby = spawnBaby(world, parent, rng)
      count++
      emit({ kind: 'hatch', uid: baby.uid, id })
    }
    world.breed[id] = progress
  }
}
