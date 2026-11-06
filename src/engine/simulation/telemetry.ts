import type { SubstrateDepths } from '@/data/types'
import type { StudioState, StudioStore, Telemetry } from '@/store/useStudioStore'
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

export function effectiveSubstrates(world: EngineWorld, substrates: SubstrateDepths): SubstrateDepths {
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

/** Queues a humidity / soilMoisture bump capped at `cap` against the effective value. */
export function bumpTelemetry(
  world: EngineWorld,
  telemetry: Pick<Telemetry, 'humidity' | 'soilMoisture'>,
  key: 'humidity' | 'soilMoisture',
  amount: number,
  cap = 99,
): void {
  const current = telemetry[key] + world.pendingTelemetry[key]
  const next = Math.min(cap, current + amount)
  world.pendingTelemetry[key] += next - current
}

/**
 * Throttled store flush: at most once per TELEMETRY_INTERVAL_MS. Writes pending substrate deltas and the
 * derived telemetry (mold count, cleanup crew, pour-driven humidity/moisture) only when something changed.
 * Returns true when the throttle window elapsed (flush attempted).
 */
export function pushTelemetry(
  world: EngineWorld,
  store: StudioStore,
  now: number,
  state: Pick<StudioState, 'substrates' | 'telemetry'> = store,
): boolean {
  if (now - world.lastTelemetryPush < TELEMETRY_INTERVAL_MS) return false
  world.lastTelemetryPush = now

  const keys = Object.keys(world.pendingSubstrates) as (keyof SubstrateDepths)[]
  if (keys.some((k) => world.pendingSubstrates[k])) {
    store.setSubstrates(effectiveSubstrates(world, state.substrates))
  }
  world.pendingSubstrates = {}

  const t = state.telemetry
  const partial: Partial<Telemetry> = {
    moldCount: world.moldPatches.length,
    cleanupCrewCount: countCleanupCrew(world),
  }
  if (world.pendingTelemetry.humidity) partial.humidity = t.humidity + world.pendingTelemetry.humidity
  if (world.pendingTelemetry.soilMoisture)
    partial.soilMoisture = t.soilMoisture + world.pendingTelemetry.soilMoisture
  world.pendingTelemetry = { humidity: 0, soilMoisture: 0 }
  store.setTelemetry(partial)
  return true
}
