import { DEFAULT_SUBSTRATES } from '@/data/substrates'
import type { PlacedItem, PumpFlow, SubstrateDepths } from '@/data/types'
import { VESSELS_BY_ID, type VesselId } from '@/data/vessels'
import { MAX_PERSISTED_GRAINS } from '@/engine/persistence'
import { TERRAIN_POINTS, type WorldEntity } from '@/engine/world'
import { clamp } from '@/lib/clamp'
import { finiteOr } from '@/lib/finite'
import { legacyPoolFields, mapLegacySubstrates, MAX_WATER_SPLIT } from './migrations'
import type { EnvSeed, StudioState } from './studio'
import { DEFAULT_TELEMETRY } from './telemetry'

export const PROTOTYPE_STORAGE_KEY_V6 = 'botanica_paludarium_v6'
export const PROTOTYPE_STORAGE_KEY = 'existence_botanica_paludarium_v5'

const PUMP_FLOWS: readonly PumpFlow[] = ['off', 'gentle', 'strong']

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** v6 saves already use the v6 substrate keys; missing or bad depths keep the defaults. */
function readV6Substrates(raw: unknown): SubstrateDepths {
  const substrates: SubstrateDepths = { ...DEFAULT_SUBSTRATES }
  if (isRecord(raw)) {
    for (const key of Object.keys(DEFAULT_SUBSTRATES) as (keyof SubstrateDepths)[]) {
      substrates[key] = finiteOr(raw[key], substrates[key])
    }
  }
  return substrates
}

/** Pool, pump and cycle fields of a v6 save, with the prototype's load defaults. */
function readV6PoolFields(saved: Record<string, unknown>) {
  return {
    pumpFlow: PUMP_FLOWS.includes(saved.pumpFlow as PumpFlow)
      ? (saved.pumpFlow as PumpFlow)
      : 'gentle',
    waterSplit: clamp(finiteOr(saved.waterSplit, 0.32), 0, MAX_WATER_SPLIT),
    cycleProgress: clamp(finiteOr(saved.cycleProgress, 1), 0, 1),
    setupDay: typeof saved.setupDay === 'number' && saved.setupDay >= 1 ? saved.setupDay : 1,
  }
}

/** The prototype's saved gauges (both formats save them); missing or bad values keep the defaults. */
function readEnvSeed(saved: Record<string, unknown>): EnvSeed {
  const d = DEFAULT_TELEMETRY
  const read = (v: unknown, fallback: number) => Math.round(finiteOr(v, fallback) * 10) / 10
  return {
    humidity: read(saved.humidity, d.humidity),
    temperature: read(saved.temperature, d.temperature),
    soilMoisture: read(saved.soilMoisture, d.soilMoisture),
    nutrients: read(saved.nutrients, d.nutrients),
  }
}

type PrototypeFormat = 'v6' | 'v5'

/**
 * One-time read of a prototype save: the v6 key first, then the v5 key. Returns null when neither
 * holds a usable save. Never deletes either key.
 */
export function importPrototypeSave(storage: Storage): Partial<StudioState> | null {
  return (
    readPrototypeSave(storage, PROTOTYPE_STORAGE_KEY_V6, 'v6') ??
    readPrototypeSave(storage, PROTOTYPE_STORAGE_KEY, 'v5')
  )
}

function readPrototypeSave(
  storage: Storage,
  key: string,
  format: PrototypeFormat,
): Partial<StudioState> | null {
  try {
    const raw = storage.getItem(key)
    if (!raw) return null
    const saved: unknown = JSON.parse(raw)
    if (!isRecord(saved) || !Array.isArray(saved.items)) return null
    const items = saved.items.filter(
      (it): it is PlacedItem =>
        isRecord(it) && typeof it.uid === 'string' && typeof it.id === 'string',
    )
    if (items.length === 0) return null

    const vessel =
      typeof saved.vessel === 'string' && Object.hasOwn(VESSELS_BY_ID, saved.vessel)
        ? (saved.vessel as VesselId)
        : 'paludarium_tank'

    const substrates =
      format === 'v6'
        ? readV6Substrates(saved.substrates)
        : mapLegacySubstrates(isRecord(saved.substrates) ? saved.substrates : {})

    const contour =
      Array.isArray(saved.terrainContour) &&
      saved.terrainContour.length === TERRAIN_POINTS &&
      saved.terrainContour.every((n) => typeof n === 'number')
        ? (saved.terrainContour as number[])
        : new Array<number>(TERRAIN_POINTS).fill(0)

    const dayCount = typeof saved.dayCount === 'number' && saved.dayCount >= 1 ? saved.dayCount : 1

    return {
      vessel,
      hasLid: typeof saved.hasLid === 'boolean' ? saved.hasLid : true,
      hasGrowLamp: typeof saved.hasGrowLamp === 'boolean' ? saved.hasGrowLamp : true,
      hasFogger: typeof saved.hasFogger === 'boolean' ? saved.hasFogger : true,
      substrates,
      dayCount,
      envSeed: readEnvSeed(saved),
      ...(format === 'v6' ? readV6PoolFields(saved) : legacyPoolFields(substrates.water)),
      worldSnapshot: {
        items,
        terrainContour: contour,
        ...(Array.isArray(saved.surfaceGrains)
          ? { substrateGrains: saved.surfaceGrains.slice(-MAX_PERSISTED_GRAINS) as WorldEntity[] }
          : {}),
      },
    }
  } catch {
    return null
  }
}
