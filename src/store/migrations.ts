import { DEFAULT_SUBSTRATES } from '@/data/substrates'
import type { PumpFlow, RoomEnv, SubstrateDepths } from '@/data/types'
import { AIR_SOURCES, DEFAULT_ROOM, PH_RANGE, TDS_RANGE, WATER_SOURCES } from '@/engine/room'
import { clamp } from '@/lib/clamp'

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

function finiteOr(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

/**
 * Coerces an unknown value into a valid room: unknown water/air ids and non-finite numbers fall
 * back to the defaults, and tds and pH are clamped to their slider ranges.
 */
export function sanitizeRoom(raw: unknown): RoomEnv {
  const r = isRecord(raw) ? raw : {}
  const water =
    typeof r.water === 'string' && Object.hasOwn(WATER_SOURCES, r.water)
      ? r.water
      : DEFAULT_ROOM.water
  const air =
    typeof r.air === 'string' && Object.hasOwn(AIR_SOURCES, r.air) ? r.air : DEFAULT_ROOM.air
  return {
    water: water as RoomEnv['water'],
    tds: clamp(finiteOr(r.tds, DEFAULT_ROOM.tds), TDS_RANGE[0], TDS_RANGE[1]),
    ph: clamp(finiteOr(r.ph, DEFAULT_ROOM.ph), PH_RANGE[0], PH_RANGE[1]),
    air: air as RoomEnv['air'],
    purifier: typeof r.purifier === 'boolean' ? r.purifier : DEFAULT_ROOM.purifier,
  }
}

function migrateV1toV2(persisted: Record<string, unknown>): Record<string, unknown> {
  const { substrates: rawSubstrates, ...rest } = persisted
  if (!isRecord(rawSubstrates)) {
    // No saved substrates: hydration keeps the default depths, whose water fills a pool.
    return { ...rest, ...legacyPoolFields(DEFAULT_SUBSTRATES.water) }
  }
  const substrates = mapLegacySubstrates(rawSubstrates)
  return { ...rest, substrates, ...legacyPoolFields(substrates.water) }
}

function migrateV2toV3(persisted: Record<string, unknown>): Record<string, unknown> {
  return {
    ...persisted,
    room: { ...DEFAULT_ROOM },
    backdrop: 'none',
    backdropHaze: 35,
    mineralSpots: 0,
  }
}

/**
 * Persisted-state migration. Version 0 (unversioned) shares the v1 shape.
 * v1 -> v2: legacy substrate keys map onto the v6 set and pool/pump/cycle fields are added.
 * v2 -> v3: the room, backdrop, backdrop haze and mineral-spot fields are added.
 * A saved room is always sanitized, so a hand-edited save cannot carry an out-of-range value.
 */
export function migrate(persisted: unknown, version: number): Record<string, unknown> {
  if (!isRecord(persisted)) return {}
  let out = persisted
  if (version < 2) out = migrateV1toV2(out)
  if (version < 3) out = migrateV2toV3(out)
  return 'room' in out ? { ...out, room: sanitizeRoom(out.room) } : out
}
