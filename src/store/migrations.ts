import { DEFAULT_SUBSTRATES } from '@/data/substrates'
import { SOUND_PRESET_IDS } from '@/data/soundPresets'
import type { BackdropId, PumpFlow, RoomEnv, SoundPresetId, SubstrateDepths } from '@/data/types'
import { DEFAULT_MUSIC_VOLUME } from '@/engine/audio/ambient'
import { AIR_SOURCES, DEFAULT_ROOM, PH_RANGE, TDS_RANGE, WATER_SOURCES } from '@/engine/room'
import { clamp } from '@/lib/clamp'
import { finiteOr } from '@/lib/finite'

/** Upper bound of `waterSplit`: the pool never takes more than 60% of the tank width. */
export const MAX_WATER_SPLIT = 0.6

/** Pool share given to a save that carries more than POOL_WATER_THRESHOLD_MM of water. */
const LEGACY_POOL_SPLIT = 0.32
const POOL_WATER_THRESHOLD_MM = 4

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/**
 * Maps a pre-v6 substrate record onto the v6 keys: lavarock folds into pebbles, moss into soil.
 * Missing, non-numeric or non-finite depths become 0, so the result never holds NaN.
 */
export function mapLegacySubstrates(raw: Record<string, unknown>): SubstrateDepths {
  return {
    pebbles: finiteOr(raw.pebbles, 0) + finiteOr(raw.lavarock, 0),
    charcoal: finiteOr(raw.charcoal, 0),
    soil: finiteOr(raw.soil, 0) + finiteOr(raw.moss, 0),
    sand: finiteOr(raw.sand, 0),
    leaflitter: finiteOr(raw.leaflitter, 0),
    rivergravel: finiteOr(raw.rivergravel, 0),
    water: finiteOr(raw.water, 0),
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

export const DEFAULT_BACKDROP: BackdropId = 'none'
export const DEFAULT_BACKDROP_HAZE = 35
export const MAX_BACKDROP_HAZE = 80

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

/** A finite haze clamped to 0..MAX_BACKDROP_HAZE; anything else becomes the default. */
export function sanitizeBackdropHaze(raw: unknown): number {
  return clamp(finiteOr(raw, DEFAULT_BACKDROP_HAZE), 0, MAX_BACKDROP_HAZE)
}

/** A finite volume clamped to 0..1; anything else becomes the default. */
export function sanitizeMusicVolume(raw: unknown): number {
  return clamp(finiteOr(raw, DEFAULT_MUSIC_VOLUME), 0, 1)
}

/** A known preset id; anything else (a hand-edited save, a removed preset) falls back to the stream. */
export function sanitizeSoundPreset(raw: unknown): SoundPresetId {
  return SOUND_PRESET_IDS.includes(raw as SoundPresetId) ? (raw as SoundPresetId) : 'stream'
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
    backdrop: DEFAULT_BACKDROP,
    backdropHaze: DEFAULT_BACKDROP_HAZE,
    mineralSpots: 0,
  }
}

/**
 * Persisted-state migration. Version 0 (unversioned) shares the v1 shape.
 * v1 -> v2: legacy substrate keys map onto the v6 set and pool/pump/cycle fields are added.
 * v2 -> v3: the room, backdrop, backdrop haze and mineral-spot fields are added.
 * A saved room is also sanitized here, but persist only calls `migrate` when the stored version
 * differs from the current one; the store's `merge` sanitizes every hydration, current saves included.
 */
export function migrate(persisted: unknown, version: number): Record<string, unknown> {
  if (!isRecord(persisted)) return {}
  let out = persisted
  if (version < 2) out = migrateV1toV2(out)
  if (version < 3) out = migrateV2toV3(out)
  return Object.hasOwn(out, 'room') ? { ...out, room: sanitizeRoom(out.room) } : out
}
