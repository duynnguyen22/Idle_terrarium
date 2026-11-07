import { findCatalogDef } from '@/data/catalog'
import type { AiState, FaunaDef } from '@/data/types'
import type { StudioState } from '@/store/useStudioStore'
import {
  BANK_W,
  getDividerNormX,
  getPoolBedNormY,
  getSoilSurfaceNormalizedY,
  getWaterTopNormY,
  hasPool,
  poolHasWater,
  type TerrainInput,
} from '../geometry'
import type { EngineWorld } from '../world'
import { frameScale, simSpeedMult, type Rng } from './constants'

const AI_STATES = [
  'wandering',
  'resting',
  'foraging',
  'exploring',
] as const satisfies readonly AiState[]
const POOL_MIN_X = 0.17
const LAND_MIN_X = 0.2
const LAND_MAX_X = 0.8

export type FaunaState = Pick<
  StudioState,
  'timeSpeed' | 'substrates' | 'waterSplit' | 'lighting'
> & {
  reducedMotion?: boolean
}

/** Horizontal band a creature keeps to (prototype 3249-3255): pool, shoreline, or land right of the divider. */
export function faunaZone(
  def: FaunaDef,
  state: Pick<StudioState, 'substrates' | 'waterSplit'>,
  dusky: boolean,
): { minX: number; maxX: number } {
  const terrain: TerrainInput = { substrates: state.substrates, waterSplit: state.waterSplit }
  const pool = poolHasWater(terrain)
  const d = getDividerNormX(state.waterSplit)
  const habitat = def.habitat || 'land'
  if (habitat === 'water' && pool) {
    return { minX: POOL_MIN_X, maxX: Math.max(POOL_MIN_X + 0.02, d - BANK_W - 0.01) }
  }
  if (habitat === 'shore' && pool) {
    if (dusky) return { minX: d - 0.02, maxX: LAND_MAX_X }
    return { minX: Math.max(POOL_MIN_X, d - BANK_W - 0.06), maxX: Math.min(LAND_MAX_X, d + 0.05) }
  }
  if (hasPool(state.waterSplit)) return { minX: d + 0.01, maxX: LAND_MAX_X }
  return { minX: LAND_MIN_X, maxX: LAND_MAX_X }
}

/**
 * Creature AI with habitat zones and day/night behaviour (prototype 3229-3281). Nocturnal land fauna hide by day,
 * swimmers bob between water top and pool bed, and floating flora rides the water surface. Dragged items and
 * mounted children are skipped.
 */
export function updateFauna(
  world: EngineWorld,
  state: FaunaState,
  dtMs: number,
  timestamp = 0,
  rng: Rng = Math.random,
): void {
  const fs = frameScale(dtMs)
  const speedMult = simSpeedMult(state.timeSpeed)
  const dusky = state.lighting === 'night' || state.lighting === 'twilight'
  const terrain: TerrainInput = {
    substrates: state.substrates,
    waterSplit: state.waterSplit,
    terrainContour: world.terrainContour,
  }
  const pool = poolHasWater(terrain)
  const d = getDividerNormX(state.waterSplit)
  const waterTop = getWaterTopNormY(terrain)
  const poolBed = getPoolBedNormY(state.substrates)
  // Easing factors are capped at 1 so a long frame (or 5x speed) never overshoots the target.
  const yEase = Math.min(1, 0.08 * fs)

  for (const item of world.items) {
    if (item.uid === world.draggingId || item.parentUid) continue
    const def = findCatalogDef(item.id)
    if (!def) continue

    if (def.category === 'flora') {
      if (def.floatsOnWater && pool && item.x < d - BANK_W) {
        item.y += (waterTop - 0.005 - item.y) * Math.min(1, 0.1 * fs)
      }
      continue
    }
    if (def.category !== 'fauna') continue

    const hiding = !!def.nocturnal && !dusky && def.habitat === 'land'
    // `??` rather than the prototype's `||`: an explicit 0 means "re-roll now".
    item.aiTimer = (item.aiTimer ?? 100) - speedMult * fs
    if (item.aiTimer <= 0) {
      item.aiState = hiding ? 'hiding' : AI_STATES[Math.floor(rng() * AI_STATES.length)]
      item.aiTimer = 90 + rng() * 140
      const spd = (def.speed || 0.25) * 0.0014
      item.vx = item.aiState === 'resting' || item.aiState === 'hiding' ? 0 : (rng() - 0.5) * spd
    }
    if (hiding && item.aiState !== 'hiding') {
      item.aiState = 'hiding'
      item.vx = 0
    }

    const { minX, maxX } = faunaZone(def, state, dusky)
    const vx = item.vx ?? 0
    if (item.x < minX - 0.01 || item.x > maxX + 0.01) {
      const target = item.x < minX ? minX : maxX
      item.x += (target - item.x) * Math.min(1, 0.02 * speedMult * fs)
    } else if (vx) {
      item.x += vx * speedMult * fs
      if (item.x < minX) {
        item.x = minX
        item.vx = Math.abs(vx)
      }
      if (item.x > maxX) {
        item.x = maxX
        item.vx = -Math.abs(vx)
      }
      item.flipX = (item.vx ?? 0) < 0
    }

    let ty: number
    if (def.habitat === 'water' && pool) {
      const wave = state.reducedMotion ? 0 : 0.28 * Math.sin(timestamp * 0.0015 + item.x * 12)
      ty = waterTop + (poolBed - waterTop) * (0.5 + wave)
    } else if (item.id === 'tree_frog' && !dusky) {
      ty = getSoilSurfaceNormalizedY(terrain, item.x) - 0.11
    } else {
      ty = getSoilSurfaceNormalizedY(terrain, item.x) - 0.021 * (item.scale || 0.8)
    }
    item.y += (ty - item.y) * yEase
    if (item.id === 'tree_frog') item.zIndex = dusky ? 40 : 0.5
  }
}
