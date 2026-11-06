import { DEFAULT_SUBSTRATES } from '@/data/substrates'
import type { PlacedItem, SubstrateDepths } from '@/data/types'
import { VESSELS_BY_ID, type VesselId } from '@/data/vessels'
import { TERRAIN_POINTS } from '@/engine/world'
import type { StudioState } from './useStudioStore'

export const PROTOTYPE_STORAGE_KEY = 'existence_botanica_paludarium_v5'

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** One-time read of a prototype save. Returns null when absent or malformed. Never deletes the key. */
export function importPrototypeSave(storage: Storage): Partial<StudioState> | null {
  try {
    const raw = storage.getItem(PROTOTYPE_STORAGE_KEY)
    if (!raw) return null
    const saved: unknown = JSON.parse(raw)
    if (!isRecord(saved) || !Array.isArray(saved.items) || saved.items.length === 0) return null

    const vessel =
      typeof saved.vessel === 'string' && saved.vessel in VESSELS_BY_ID
        ? (saved.vessel as VesselId)
        : 'paludarium_tank'

    const substrates: SubstrateDepths = { ...DEFAULT_SUBSTRATES }
    if (isRecord(saved.substrates)) {
      for (const key of Object.keys(DEFAULT_SUBSTRATES) as (keyof SubstrateDepths)[]) {
        const v = saved.substrates[key]
        if (typeof v === 'number' && Number.isFinite(v)) substrates[key] = v
      }
    }

    const contour =
      Array.isArray(saved.terrainContour) &&
      saved.terrainContour.length === TERRAIN_POINTS &&
      saved.terrainContour.every((n) => typeof n === 'number')
        ? (saved.terrainContour as number[])
        : new Array<number>(TERRAIN_POINTS).fill(0)

    const dayCount =
      typeof saved.dayCount === 'number' && saved.dayCount >= 1 ? saved.dayCount : 1

    return {
      vessel,
      hasLid: typeof saved.hasLid === 'boolean' ? saved.hasLid : true,
      hasGrowLamp: typeof saved.hasGrowLamp === 'boolean' ? saved.hasGrowLamp : true,
      hasFogger: typeof saved.hasFogger === 'boolean' ? saved.hasFogger : true,
      substrates,
      dayCount,
      worldSnapshot: { items: saved.items as PlacedItem[], terrainContour: contour },
    }
  } catch {
    return null
  }
}
