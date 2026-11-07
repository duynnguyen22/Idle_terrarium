import { DEFAULT_SUBSTRATES } from '@/data/substrates'
import type { PumpFlow, SubstrateDepths } from '@/data/types'

/** Upper bound of `waterSplit`: the pool never takes more than 60% of the tank width. */
export const MAX_WATER_SPLIT = 0.6

/** Pool share given to a save that carries more than POOL_WATER_THRESHOLD_MM of water. */
const LEGACY_POOL_SPLIT = 0.32
const POOL_WATER_THRESHOLD_MM = 4

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function finiteOrZero(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0
}

/**
 * Maps a pre-v6 substrate record onto the v6 keys: lavarock folds into pebbles, moss into soil.
 * Missing, non-numeric or non-finite depths become 0, so the result never holds NaN.
 */
export function mapLegacySubstrates(raw: Record<string, unknown>): SubstrateDepths {
  return {
    pebbles: finiteOrZero(raw.pebbles) + finiteOrZero(raw.lavarock),
    charcoal: finiteOrZero(raw.charcoal),
    soil: finiteOrZero(raw.soil) + finiteOrZero(raw.moss),
    sand: finiteOrZero(raw.sand),
    leaflitter: finiteOrZero(raw.leaflitter),
    rivergravel: finiteOrZero(raw.rivergravel),
    water: finiteOrZero(raw.water),
  }
}

/**
 * Pool, pump and cycle fields for a save written before they existed. `setupDay` takes the spec
 * loader's default of 1 (`saved.setupDay || 1`), so an upgraded long-running build does not reopen
 * the early-days mold window.
 */
export function legacyPoolFields(water: number): {
  pumpFlow: PumpFlow
  waterSplit: number
  cycleProgress: number
  setupDay: number
} {
  return {
    pumpFlow: 'gentle',
    waterSplit: water > POOL_WATER_THRESHOLD_MM ? LEGACY_POOL_SPLIT : 0,
    cycleProgress: 1,
    setupDay: 1,
  }
}

/**
 * Persisted-state migration. Version 0 (unversioned) shares the v1 shape.
 * v1 -> v2: legacy substrate keys map onto the v6 set and pool/pump/cycle fields are added.
 */
export function migrate(persisted: unknown, version: number): Record<string, unknown> {
  if (!isRecord(persisted)) return {}
  if (version >= 2) return persisted

  const { substrates: rawSubstrates, ...rest } = persisted
  if (!isRecord(rawSubstrates)) {
    // No saved substrates: hydration keeps the default depths, whose water fills a pool.
    return { ...rest, ...legacyPoolFields(DEFAULT_SUBSTRATES.water) }
  }
  const substrates = mapLegacySubstrates(rawSubstrates)
  return { ...rest, substrates, ...legacyPoolFields(substrates.water) }
}
