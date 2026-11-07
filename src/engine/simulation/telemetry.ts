import type { SubstrateDepths } from '@/data/types'
import type { StudioState, StudioStore } from '@/store/useStudioStore'
import type { EngineWorld } from '../world'
import { countCleanupCrew } from './mold'

/** The engine writes to the store at most 4 times per second. */
export const TELEMETRY_INTERVAL_MS = 250

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
 * Throttled store flush: at most once per TELEMETRY_INTERVAL_MS. Writes pending substrate deltas, the
 * environment gauges plus derived telemetry (mold count, cleanup crew, care issues), cycle progress and a
 * pending water split. The store's per-key diff keeps unchanged values from re-rendering.
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
  store.setTelemetry({
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
  if (env.cycleProgress !== state.cycleProgress) store.setCycleProgress(env.cycleProgress)
  if (world.pendingWaterSplit !== undefined) {
    store.setWaterSplit(world.pendingWaterSplit)
    world.pendingWaterSplit = undefined
  }
  return true
}
