import { findCatalogDef } from '@/data/catalog'
import type { PlacedItem } from '@/data/types'
import { hashStr, mulberry32, type Rng } from '@/lib/rng'
import type { StudioState, StudioStore } from '@/store/useStudioStore'
import { restoreWorld, snapshotWorld } from '../persistence'
import type { EngineWorld } from '../world'
import { breedConditions, breedStep } from './breed'
import { slowStep, type DayState } from './dayTick'
import { ecologyStep } from './ecology'
import {
  lifePace,
  lifeStep,
  lightDose,
  nextStep,
  type Emit,
  type EventKind,
  type LifeEnv,
  type LifeEvent,
} from './life'
import { paceMs } from './pace'
import { buildReport, NOTABLE, upcomingHints, type AwayReport } from './report'

/** Shortest absence (ms) that triggers an offline catch-up. */
export const CATCHUP_MIN_GAP_MS = 600_000
/** Longest absence a catch-up simulates, in tank days; longer gaps are capped. */
export const CATCHUP_MAX_DAYS = 30
/** Most away reports kept in the persisted log. */
export const AWAY_LOG_MAX = 12

/** Tank hours below which a catch-up never nudges a plant. */
const NUDGE_MIN_TANK_HOURS = 8
/** A plant must be within this much of a cycle below its next step to be nudged. */
const NUDGE_REACH = 0.35
/** Longest catch-up in tank hours. */
const MAX_TANK_HOURS = CATCHUP_MAX_DAYS * 24
/** A leftover step shorter than this fraction of an hour is dropped. */
const STEP_EPSILON = 0.02
/** While away, nutrients never fall below this (or the starting level, if lower). */
const AWAY_NUTRIENT_FLOOR = 30

export type CatchUpState = DayState & Pick<StudioState, 'worldSeed'>

export interface CatchUpOpts {
  reason: string
  away: boolean
  preview: boolean
  mode: AwayReport['mode']
  /** Overrides the tank hours computed from the span (the "+1 day" button passes 24). */
  tankHours?: number
}

/**
 * Runs `tankHours` of tank time in 1-hour steps: ecology, life, breeding, then the slow rules. While `away`,
 * plants may go to rest and nutrients stay above `min(start, 30)`.
 */
export function advanceWorld(
  world: EngineWorld,
  tankHours: number,
  state: CatchUpState,
  rng: Rng,
  emit: Emit,
  away: boolean,
): void {
  const whole = Math.floor(tankHours)
  const steps = whole + (tankHours - whole > STEP_EPSILON ? 1 : 0)
  const dt = 1 / 24
  const nutrientFloor = Math.min(world.env.nutrients, AWAY_NUTRIENT_FLOOR)
  const env: LifeEnv = {
    lightDose: lightDose(state),
    terrain: { substrates: state.substrates, waterSplit: state.waterSplit },
  }
  for (let i = 0; i < steps; i++) {
    ecologyStep(world, dt, { away }, emit)
    lifeStep(world, dt, rng, emit, env)
    breedStep(world, dt, rng, emit, breedConditions(world, state))
    slowStep(world, dt, state, away ? { away, nutrientFloor, emit } : { away, emit })
  }
}

/**
 * Lifts the plant closest below its next non-fade milestone (within 0.35 of a cycle) onto it and emits that event.
 * Returns false when no plant qualifies.
 */
export function nudgeOne(world: EngineWorld, emit: Emit): boolean {
  const dose = lightDose({ hasGrowLamp: true })
  let best: { item: PlacedItem; step: { name: EventKind; at: number }; gap: number } | null = null
  for (const item of world.items) {
    if (!item.life || item.baby !== undefined || lifePace(item, dose) <= 0) continue
    const step = nextStep(item)
    if (!step || step.name === 'fade') continue
    const gap = step.at - item.life.cyc
    if (gap > NUDGE_REACH) continue
    if (!best || gap < best.gap) best = { item, step, gap }
  }
  if (!best || !best.item.life) return false
  best.item.life.cyc = best.step.at
  emit({ kind: best.step.name, uid: best.item.uid, id: best.item.id })
  return true
}

function speciesName(id: string): string {
  return findCatalogDef(id)?.name ?? id
}

/**
 * Simulates the span `from` to `to` (epoch ms) and reports what happened. Deterministic for a given world seed and
 * `from`. If the simulation throws, the world's persistable parts are restored and the error is rethrown.
 */
export function catchUpSpan(
  world: EngineWorld,
  state: CatchUpState,
  from: number,
  to: number,
  opts: CatchUpOpts,
): AwayReport {
  const gap = to - from
  const raw = opts.tankHours ?? (gap / paceMs(state.pace)) * 24
  const tankHours = Math.min(MAX_TANK_HOURS, raw)
  const rng = mulberry32(hashStr(`${state.worldSeed}:${from}`))
  const events: LifeEvent[] = []
  const emit: Emit = (e) => events.push(e)
  const wasResting = new Set(world.items.filter((i) => i.resting).map((i) => i.uid))
  // `snapshotWorld` covers items, ecoTime and breed; `slowStep` also moves env and mold, so keep those too.
  const snap = snapshotWorld(world)
  const dayCount = Math.floor(world.ecoTime) + 1
  const env = structuredClone(world.env)
  const moldPatches = structuredClone(world.moldPatches)
  const moldClearAcc = world.moldClearAcc
  try {
    advanceWorld(world, tankHours, state, rng, emit, opts.away)
    if (tankHours >= NUDGE_MIN_TANK_HOURS && !events.some((e) => NOTABLE[e.kind] === 1)) {
      nudgeOne(world, emit)
    }
  } catch (err) {
    restoreWorld(world, snap, dayCount)
    world.env = env
    world.moldPatches = moldPatches
    world.moldClearAcc = moldClearAcc
    throw err
  }
  const restNames: string[] = []
  for (const item of world.items) {
    if (!item.resting || wasResting.has(item.uid)) continue
    const name = speciesName(item.id)
    if (!restNames.includes(name)) restNames.push(name)
  }
  const { items, more, rest } = buildReport(events, restNames)
  return {
    from,
    to,
    hours: gap / 3_600_000,
    tankHours,
    capped: raw > MAX_TANK_HOURS,
    mode: opts.mode,
    reason: opts.reason,
    items,
    more,
    rest,
    hints: upcomingHints(world, state),
  }
}

/**
 * Catches the garden up on a return after at least ten minutes away. No clock, a backwards clock or disabled
 * catch-up only reset the clock; a short gap leaves it alone. Pushes and returns the report when it ran.
 */
export function runCatchUpIfDue(
  world: EngineWorld,
  store: StudioStore,
  now: number,
): AwayReport | null {
  const last = store.lastSimulatedAt
  if (last === null || now - last < 0) {
    store.setLastSimulatedAt(now)
    return null
  }
  if (now - last < CATCHUP_MIN_GAP_MS) return null
  if (!store.catchupEnabled) {
    store.setLastSimulatedAt(now)
    return null
  }
  const report = catchUpSpan(world, store, last, now, {
    mode: 'away',
    reason: 'return',
    away: true,
    preview: false,
  })
  store.pushAwayReport(report)
  store.setLastSimulatedAt(now)
  return report
}
