import type { SubstrateDepths } from '@/data/types'
import type { Store } from 'jotai'
import {
  cycleProgressAtom,
  dayCountAtom,
  envSeedAtom,
  lastSimulatedAtAtom,
  mineralSpotsAtom,
  substratesAtom,
  waterSplitAtom,
  type StudioState,
} from '@/store/studio'
import { telemetryAtom } from '@/store/telemetry'
import type { EngineWorld } from '../world'
import { countCleanupCrew } from './mold'

/** The engine writes to the store at most 4 times per second. */
export const TELEMETRY_INTERVAL_MS = 250
/** The persisted environment seed is written at most once per this interval. */
export const ENV_SEED_INTERVAL_MS = 5000
/** The world snapshot is committed and `lastSimulatedAt` stamped at most once per this interval. */
export const SNAPSHOT_INTERVAL_MS = 60_000
/** Cycle progress reaches the (persisted) studio store in steps of 1/CYCLE_PROGRESS_STEPS, floored so the store never runs ahead of the engine. */
const CYCLE_PROGRESS_STEPS = 210

type StateSlice = Pick<StudioState, 'substrates' | 'cycleProgress' | 'dayCount'>

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

/** The current values of the fields flushTelemetry compares against. */
function readSlice(store: Store): StateSlice {
  return {
    substrates: store.get(substratesAtom),
    cycleProgress: store.get(cycleProgressAtom),
    dayCount: store.get(dayCountAtom),
  }
}

/**
 * Throttled store flush: at most once per TELEMETRY_INTERVAL_MS. The live gauges and derived telemetry
 * (mold count, cleanup crew, care issues) go to the unpersisted telemetry atom, whose per-key diff keeps
 * unchanged values from re-rendering. Persisted studio fields are written only on a real change, because
 * every change rewrites the save: pending substrate deltas, cycle progress quantised to 1/210,
 * a pending water split, and the rounded env seed at most once per ENV_SEED_INTERVAL_MS.
 * `state` (default: read from `store` when the flush runs) is what the flush compares against.
 * Returns true when the throttle window elapsed (flush attempted).
 */
export function pushTelemetry(
  world: EngineWorld,
  store: Store,
  now: number,
  state?: StateSlice,
  commit?: () => void,
): boolean {
  if (now - world.lastTelemetryPush < TELEMETRY_INTERVAL_MS) return false
  world.lastTelemetryPush = now
  flushTelemetry(world, store, state)
  if (commit && now - world.lastSnapshotCommit >= SNAPSHOT_INTERVAL_MS) {
    world.lastSnapshotCommit = now
    commit()
    store.set(lastSimulatedAtAtom, Date.now())
  }
  if (now - world.lastEnvSeedPush >= ENV_SEED_INTERVAL_MS) {
    world.lastEnvSeedPush = now
    flushEnvSeed(world, store)
  }
  return true
}

/**
 * The unthrottled body of pushTelemetry (everything but the env seed cadence): pending substrates,
 * the live gauges and care issues, cycle progress, the day count and a pending water split. Called directly when a
 * discrete change (e.g. +1 day) must reach the store before the next throttled push.
 */
export function flushTelemetry(
  world: EngineWorld,
  store: Store,
  state: StateSlice = readSlice(store),
): void {
  const keys = Object.keys(world.pendingSubstrates) as (keyof SubstrateDepths)[]
  if (keys.some((k) => world.pendingSubstrates[k])) {
    store.set(substratesAtom, effectiveSubstrates(world, state.substrates))
  }
  world.pendingSubstrates = {}

  const env = world.env
  store.set(telemetryAtom, {
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
  if (cycle !== state.cycleProgress) store.set(cycleProgressAtom, cycle)
  // The day counter is derived from living time: tank day N runs from ecoTime N - 1 to N.
  const day = Math.floor(world.ecoTime) + 1
  if (day !== state.dayCount) store.set(dayCountAtom, day)
  if (world.pendingWaterSplit !== undefined) {
    store.set(waterSplitAtom, world.pendingWaterSplit)
    world.pendingWaterSplit = undefined
  }
}

/**
 * Write the environment seed to the persisted studio atoms now, outside the 5 s cadence (used when the tab is
 * hidden or the engine unmounts, so a care change made just before a reload is not lost).
 * envSeedAtom rounds to 1 decimal and skips the write when nothing changed.
 */
export function flushEnvSeed(world: EngineWorld, store: Store): void {
  const env = world.env
  store.set(envSeedAtom, {
    humidity: env.humidity,
    temperature: env.temperature,
    soilMoisture: env.soilMoisture,
    nutrients: env.nutrients,
  })
  const spots = +world.mineralSpots.toFixed(3)
  if (spots !== store.get(mineralSpotsAtom)) store.set(mineralSpotsAtom, spots)
}
