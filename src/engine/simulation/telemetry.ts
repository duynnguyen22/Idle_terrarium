import type { SubstrateDepths } from '@/data/types'
import type { StudioState, StudioStore } from '@/store/useStudioStore'
import { useTelemetryStore } from '@/store/useTelemetryStore'
import type { EngineWorld } from '../world'
import { countCleanupCrew } from './mold'

/** The engine writes to the stores at most 4 times per second. */
export const TELEMETRY_INTERVAL_MS = 250
/** The persisted environment seed is written at most once per this interval. */
export const ENV_SEED_INTERVAL_MS = 5000
/** Cycle progress reaches the (persisted) studio store in steps of 1/CYCLE_PROGRESS_STEPS, floored so the store never runs ahead of the engine. */
const CYCLE_PROGRESS_STEPS = 210

/** Store substrates plus the deltas pouring has accumulated but not yet flushed. */
export function effectiveSubstrate(
  world: EngineWorld,
  substrates: Partial<SubstrateDepths>,
  id: string,
): number {
  const key = id as keyof SubstrateDepths
  return (substrates[key] || 0) + (world.pendingSubstrates[key] || 0)
}

export function effectiveSubstrates(
  world: EngineWorld,
  substrates: SubstrateDepths,
): SubstrateDepths {
  const out = { ...substrates }
  for (const k of Object.keys(world.pendingSubstrates) as (keyof SubstrateDepths)[]) {
    out[k] = (out[k] || 0) + (world.pendingSubstrates[k] || 0)
  }
  return out
}

/** Sets an effective substrate depth (clamped to [0, max]) by queueing the difference. */
export function setEffectiveSubstrate(
  world: EngineWorld,
  substrates: Partial<SubstrateDepths>,
  id: string,
  next: number,
): void {
  const key = id as keyof SubstrateDepths
  const current = effectiveSubstrate(world, substrates, id)
  world.pendingSubstrates[key] = (world.pendingSubstrates[key] || 0) + (next - current)
}

/**
 * Throttled store flush: at most once per TELEMETRY_INTERVAL_MS. The live gauges and derived telemetry
 * (mold count, cleanup crew, care issues) go to the unpersisted telemetry store, whose per-key diff keeps
 * unchanged values from re-rendering. Persisted studio fields are written only on a real change, because
 * persist rewrites storage on every set(): pending substrate deltas, cycle progress quantised to 1/210,
 * a pending water split, and the rounded env seed at most once per ENV_SEED_INTERVAL_MS.
 * Returns true when the throttle window elapsed (flush attempted).
 */
export function pushTelemetry(
  world: EngineWorld,
  store: StudioStore,
  now: number,
  state: Pick<StudioState, 'substrates' | 'cycleProgress'> = store,
): boolean {
  if (now - world.lastTelemetryPush < TELEMETRY_INTERVAL_MS) return false
  world.lastTelemetryPush = now

  const keys = Object.keys(world.pendingSubstrates) as (keyof SubstrateDepths)[]
  if (keys.some((k) => world.pendingSubstrates[k])) {
    store.setSubstrates(effectiveSubstrates(world, state.substrates))
  }
  world.pendingSubstrates = {}

  const env = world.env
  useTelemetryStore.getState().setTelemetry({
    humidity: env.humidity,
    temperature: env.temperature,
    soilMoisture: env.soilMoisture,
    nutrients: env.nutrients,
    o2Balance: env.o2,
    condensation: env.condensation,
    moldCount: world.moldPatches.length,
    cleanupCrewCount: countCleanupCrew(world),
    careIssues: world.careIssues,
  })
  const cycle = Math.floor(env.cycleProgress * CYCLE_PROGRESS_STEPS) / CYCLE_PROGRESS_STEPS
  if (cycle !== state.cycleProgress) store.setCycleProgress(cycle)
  if (world.pendingWaterSplit !== undefined) {
    store.setWaterSplit(world.pendingWaterSplit)
    world.pendingWaterSplit = undefined
  }
  if (now - world.lastEnvSeedPush >= ENV_SEED_INTERVAL_MS) {
    world.lastEnvSeedPush = now
    flushEnvSeed(world, store)
  }
  return true
}

/**
 * Write the environment seed to the persisted store now, outside the 5 s cadence (used when the tab is
 * hidden or the engine unmounts, so a care change made just before a reload is not lost).
 * setEnvSeed rounds to 1 decimal and skips set() when nothing changed.
 */
export function flushEnvSeed(world: EngineWorld, store: Pick<StudioStore, 'setEnvSeed'>): void {
  const env = world.env
  store.setEnvSeed({
    humidity: env.humidity,
    temperature: env.temperature,
    soilMoisture: env.soilMoisture,
    nutrients: env.nutrients,
  })
}
