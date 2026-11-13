import type { PlacedItem } from '@/data/types'
import { poolHasWater } from '@/engine/geometry'
import type { Rng } from '@/lib/rng'
import { createItemId } from '@/lib/ids'
import type { StudioState } from '@/store/studio'
import type { EngineWorld } from '../world'
import { itemStress, poolScore, REST_FLOOR } from './ecology'
import { ITEM_CAP, type Emit } from './life'

export interface BreedConditions {
  nutrients: number
  soilMoisture: number
  humidity: number
  leaflitter: number
  poolHasWater: boolean
  cycleProgress: number
  poolScore: number
  temperature: number
  /** Springtails and dwarf white isopods in the tank: what dart frogs forage on. */
  smallPrey: number
}

export interface BreedDef {
  /** Tank days of good conditions per newborn. */
  days: number
  /** Most individuals of the species, babies included. */
  cap: number
  /** Needs two adults to breed (the all-female species do not). */
  pair?: boolean
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
  powder_orange: {
    days: 3.5,
    cap: 6,
    needs: (c) => (c.nutrients > 25 && c.humidity > 45 ? null : 'nutrients and less dry air'),
  },
  dwarf_white: {
    days: 3,
    cap: 8,
    needs: (c) => (c.humidity >= 75 && c.soilMoisture > 55 ? null : '75% humidity and moist soil'),
  },
  bumblebee_millipede: {
    days: 18,
    cap: 3,
    pair: true,
    needs: (c) => (c.humidity >= 70 && c.leaflitter > 1 ? null : 'leaf litter and 70% humidity'),
  },
  phantasmal_dart: {
    days: 14,
    cap: 4,
    pair: true,
    needs: (c) =>
      c.poolHasWater && c.humidity >= 80 && c.smallPrey > 0
        ? null
        : 'a pool, 80% humidity and springtails to eat',
  },
  mourning_gecko: {
    days: 10,
    cap: 5,
    needs: (c) =>
      c.humidity >= 60 && c.temperature >= 21 && c.temperature <= 29 ? null : 'warm, humid nights',
  },
  ramshorn_snail: {
    days: 4,
    cap: 8,
    // The port has no pool food model; nutrients stand in for leftovers and biofilm.
    needs: (c) => (c.poolHasWater && c.nutrients > 25 ? null : 'spare food in the pool'),
  },
}

/** Species that never breed here, with the reason the growth board gives. */
export const NO_BREED_NOTE: Readonly<Partial<Record<string, string>>> = {
  nerite_snail: 'Lays white eggs that cannot hatch in fresh water',
  amano_shrimp: 'Carries eggs, but the larvae need salt water',
}

/** Who eats whom. Hunting slows the prey's breeding; only while you watch can it take one. */
export const PREDATION: readonly { pred: string; prey: readonly string[]; perDay: number }[] = [
  { pred: 'phantasmal_dart', prey: ['springtails', 'dwarf_white'], perDay: 0.12 },
  { pred: 'vampire_crab', prey: ['ramshorn_snail'], perDay: 0.12 },
]

/** Soft-leaved plants a hungry millipede nibbles when the air is dry, and the humidity below which it does. */
const NIBBLED = ['peacock_fern', 'boston_fern', 'fittonia']
const NIBBLE_BELOW = 70

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
    temperature: env.temperature,
    smallPrey: world.items.filter((i) => i.id === 'springtails' || i.id === 'dwarf_white').length,
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
    if (adults.length === 0 || count >= def.cap || world.items.length >= ITEM_CAP) continue
    if (def.pair && adults.length < 2) continue
    if (def.needs(cond) !== null) continue
    let stress = 0
    for (const a of adults) stress += itemStress(a, world.env)
    if (stress / adults.length >= 0.4) continue

    let progress = (world.breed[id] ?? 0) + dtDay / def.days
    while (progress >= 1) {
      if (count >= def.cap || world.items.length >= ITEM_CAP) {
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

/**
 * One tank-day step of hunting and grazing damage. Each adult hunter pulls its prey's breeding progress down by
 * `perDay * dt`; every whole unit lost takes one prey (a baby first), but never while `away` and never the last two.
 * Adult millipedes in air under 70% humidity wear soft-leaved plants down to 10 below the rest floor.
 */
export function huntStep(
  world: EngineWorld,
  dtDay: number,
  rng: Rng,
  emit: Emit,
  opts: { away: boolean },
): void {
  for (const rule of PREDATION) {
    const hunters = world.items.filter((i) => i.id === rule.pred && i.baby === undefined)
    if (hunters.length === 0) continue
    for (const id of rule.prey) {
      const prey = world.items.filter((i) => i.id === id)
      if (prey.length === 0) continue
      const progress = (world.breed[id] ?? 0) - dtDay * rule.perDay * hunters.length
      if (progress > -1) {
        world.breed[id] = progress
        continue
      }
      world.breed[id] = progress + 1
      if (opts.away || prey.length <= 2) continue
      const victim = prey.find((i) => i.baby !== undefined) ?? prey[Math.floor(rng() * prey.length)]
      if (!victim) continue
      world.items.splice(world.items.indexOf(victim), 1)
      emit({ kind: 'eaten', id, uid: hunters[0]!.uid })
    }
  }

  const mills = world.items.filter(
    (i) => i.id === 'bumblebee_millipede' && i.baby === undefined,
  ).length
  if (mills > 0 && world.env.humidity < NIBBLE_BELOW) {
    for (const plant of world.items) {
      if (!NIBBLED.includes(plant.id)) continue
      plant.vitality = Math.max(REST_FLOOR - 10, (plant.vitality ?? 96) - dtDay * 4 * mills)
    }
  }
}
