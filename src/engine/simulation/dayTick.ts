import { findCatalogDef } from '@/data/catalog'
import type { PlacedItem } from '@/data/types'
import { clamp } from '@/lib/clamp'
import type { Rng } from '@/lib/rng'
import type { StudioState } from '@/store/useStudioStore'
import { CYCLE_DAYS } from '../care'
import { hasPool } from '../geometry'
import type { EngineWorld } from '../world'
import { breedConditions, breedStep } from './breed'
import { ecologyStep } from './ecology'
import { lifeStep, lightDose, type Emit } from './life'
import { countCleanupCrew } from './mold'
import { dtDayForFrame } from './pace'

export type DayState = Pick<
  StudioState,
  'timeSpeed' | 'pace' | 'hasGrowLamp' | 'pumpFlow' | 'substrates' | 'waterSplit'
>

/** Sprout `growthProgress` gained per tank day. */
const SPROUT_RATE = 0.6
/** A seedling starts at this progress when none is stored. */
const SPROUT_START = 0.2
/** Nutrients lost per flora and gained per cleanup-crew member (max 4) per tank day. */
const NUTRIENT_PER_FLORA = 0.4
const NUTRIENT_PER_CREW = 1.4
const LITTER_FACTOR_BARE = 0.35
/** Default nutrient floor, and the ceiling. */
const NUTRIENT_MIN = 15
const NUTRIENT_MAX = 100
/** Mold patches one cleanup-crew member (max 6) clears per tank day. */
const MOLD_CLEARED_PER_CREW_DAY = 27
/** The pool cycles more slowly with the pump off. */
const PUMP_OFF_CYCLE_FACTOR = 0.4

/** Render scale of a sprout: `base` scaled from 0.58 up to 1 as `growthProgress` goes 0 to 1. */
export function sproutScale(item: PlacedItem, base: number): number {
  const gp = item.growthProgress ?? SPROUT_START
  return base * (0.58 + Math.min(0.42, gp * 0.42))
}

/**
 * The slow, per-tank-day rules: `ecoTime`, sprout growth (a sprout at progress 1 becomes `mature` at its species
 * size; a `born` one emits `grown`), the pool's nitrogen cycle (`onCycled` fires once when it reaches 1), nutrients
 * (never below `nutrientFloor`, default 15) and mold cleared by the cleanup crew via the `moldClearAcc` remainder.
 */
export function slowStep(
  world: EngineWorld,
  dtDay: number,
  state: DayState,
  /** `away` is informational; the offline catch-up passes the away nutrient floor explicitly. */
  opts: { away: boolean; nutrientFloor?: number; emit?: Emit; onCycled?: () => void },
): void {
  world.ecoTime += dtDay
  const env = world.env

  let flora = 0
  for (const item of world.items) {
    if (item.category !== 'flora') continue
    flora++
    if (item.stage !== 'sprout') continue
    const gp = (item.growthProgress ?? SPROUT_START) + SPROUT_RATE * dtDay
    item.growthProgress = gp
    if (gp >= 1) {
      item.stage = 'mature'
      const def = findCatalogDef(item.id)
      if (def) item.scale = def.baseScale
      if (item.born) opts.emit?.({ kind: 'grown', uid: item.uid, id: item.id })
    }
  }

  if (hasPool(state.waterSplit) && env.cycleProgress < 1) {
    env.cycleProgress = Math.min(
      1,
      env.cycleProgress +
        (dtDay / CYCLE_DAYS) * (state.pumpFlow === 'off' ? PUMP_OFF_CYCLE_FACTOR : 1),
    )
    if (env.cycleProgress >= 1) opts.onCycled?.()
  }

  const crew = countCleanupCrew(world)
  const litter = (state.substrates.leaflitter || 0) > 1 ? 1 : LITTER_FACTOR_BARE
  env.nutrients = clamp(
    env.nutrients +
      (-NUTRIENT_PER_FLORA * flora + NUTRIENT_PER_CREW * Math.min(4, crew) * litter) * dtDay,
    opts.nutrientFloor ?? NUTRIENT_MIN,
    NUTRIENT_MAX,
  )

  if (crew > 0 && world.moldPatches.length > 0) {
    world.moldClearAcc += MOLD_CLEARED_PER_CREW_DAY * Math.min(6, crew) * dtDay
    while (world.moldClearAcc >= 1 && world.moldPatches.length > 0) {
      world.moldPatches.shift()
      world.moldClearAcc -= 1
    }
  }
  if (world.moldPatches.length === 0) world.moldClearAcc = 0
}

/**
 * Runs `dtDay` tank days of living time: plant ecology, life cycles, breeding and the slow per-day rules, in that
 * order. `dayTick` feeds it one frame; the temporary "+1 day" button feeds it a whole day at once.
 */
export function stepDays(
  world: EngineWorld,
  state: DayState,
  dtDay: number,
  rng: Rng,
  emit: Emit,
  onCycled?: () => void,
): void {
  ecologyStep(world, dtDay, { away: false }, emit)
  lifeStep(world, dtDay, rng, emit, {
    lightDose: lightDose(state),
    terrain: { substrates: state.substrates, waterSplit: state.waterSplit },
  })
  breedStep(world, dtDay, rng, emit, breedConditions(world, state))
  slowStep(world, dtDay, state, { away: false, emit, onCycled })
}

/**
 * One frame of living time: converts the frame to tank days at the current pace (the frame is capped and nothing
 * happens while paused), then runs `stepDays`.
 */
export function dayTick(
  world: EngineWorld,
  state: DayState,
  dtMs: number,
  rng: Rng,
  emit: Emit,
  onCycled?: () => void,
): void {
  const dtDay = dtDayForFrame(dtMs, state.timeSpeed, state.pace)
  if (dtDay === 0) return
  stepDays(world, state, dtDay, rng, emit, onCycled)
}
