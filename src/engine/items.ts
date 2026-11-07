import { findCatalogDef } from '@/data/catalog'
import type { GrowthStage, PlacedItem } from '@/data/types'
import {
  BANK_W,
  getDividerNormX,
  getPoolBedNormY,
  getSoilSurfaceNormalizedY,
  getWaterTopNormY,
  hasPool,
  randomLandX,
  type TerrainInput,
} from '@/engine/geometry'
import type { Rng } from './simulation/constants'
import { clamp } from '@/lib/clamp'
import { createItemId } from '@/lib/ids'
import type { EngineWorld } from './world'

/** Prototype inspector steps (docs/reference/prototype.html 3061-3108). */
export const SCALE_STEP = 0.1
export const SCALE_MIN = 0.45
export const SCALE_MAX = 2.2
export const ROTATION_STEP = 15
export const GROW_FACTOR = 1.12
export const GROW_MAX_SCALE = 1.65
export const DUPLICATE_OFFSET_X = 0.05
export const SPROUT_SCALE = 0.62

export interface AddItemOptions {
  /** Terrain used to find the soil surface, divider and water level. */
  terrain: TerrainInput
  x?: number
  y?: number
  rng?: Rng
}

function find(world: EngineWorld, uid: string): PlacedItem | undefined {
  return world.items.find((i) => i.uid === uid)
}

/**
 * Places a catalog item (prototype addItemToTerrarium). `stage` applies to flora only; fauna get their runtime
 * fields (vx/vy/aiState/aiTimer). Returns the new item, or null for an unknown id.
 */
export function addItem(
  world: EngineWorld,
  defId: string,
  stage: GrowthStage,
  options: AddItemOptions,
): PlacedItem | null {
  const def = findCatalogDef(defId)
  if (!def) return null
  const { terrain } = options
  const rng = options.rng ?? Math.random
  const pooled = hasPool(terrain.waterSplit)
  const inWater = def.category === 'fauna' && def.habitat === 'water' && pooled
  const floats = def.category === 'flora' && !!def.floatsOnWater && pooled
  const poolX = () =>
    0.17 + rng() * Math.max(0.02, getDividerNormX(terrain.waterSplit) - BANK_W - 0.19)
  let x = options.x
  let y = options.y
  if (inWater || floats) {
    x ??= poolX()
    y ??= inWater
      ? (getWaterTopNormY(terrain) + getPoolBedNormY(terrain.substrates)) / 2
      : getWaterTopNormY(terrain)
  } else {
    x ??= randomLandX(terrain, rng)
    y ??= getSoilSurfaceNormalizedY(terrain, x) - (def.category === 'fauna' ? 0.03 : 0.05)
  }
  const isFlora = def.category === 'flora'
  const sprout = isFlora && stage === 'sprout'

  const item: PlacedItem = {
    uid: createItemId(),
    id: def.id,
    category: def.category,
    isWaterfall: def.category === 'hardscape' && !!def.isWaterfall,
    x,
    y,
    scale: sprout ? def.baseScale * SPROUT_SCALE : def.baseScale,
    rotation: 0,
    flipX: rng() > 0.5,
    stage: isFlora ? stage : 'mature',
    growthProgress: sprout ? 0.2 : 0.8,
    vitality: 98,
    parentUid: null,
    offsetX: 0,
    offsetY: 0,
    zIndex: world.items.length + 1,
  }
  if (def.category === 'fauna') {
    item.vx = (rng() - 0.5) * 0.0004
    item.vy = 0
    item.aiState = 'wandering'
    item.aiTimer = 100 + rng() * 120
  }
  world.items.push(item)
  return item
}

/** direction +1 larger, -1 smaller; clamped to [0.45, 2.2]. */
export function scaleItem(world: EngineWorld, uid: string, direction: 1 | -1): void {
  const it = find(world, uid)
  if (it) it.scale = clamp((it.scale || 1) + direction * SCALE_STEP, SCALE_MIN, SCALE_MAX)
}

/** direction +1 clockwise, -1 counter-clockwise (15 degrees). */
export function rotateItem(world: EngineWorld, uid: string, direction: 1 | -1): void {
  const it = find(world, uid)
  if (it) it.rotation = (it.rotation || 0) + direction * ROTATION_STEP
}

export function flipItem(world: EngineWorld, uid: string): void {
  const it = find(world, uid)
  if (it) it.flipX = !it.flipX
}

/** direction +1 bring forward, -1 send backward (zIndex never below 0). */
export function reorderItem(world: EngineWorld, uid: string, direction: 1 | -1): void {
  const it = find(world, uid)
  if (!it) return
  it.zIndex = direction === 1 ? (it.zIndex || 1) + 1 : Math.max(0, (it.zIndex || 1) - 1)
}

/** Grow button: scale x1.12 (capped at 1.65) and stage becomes lush. Flora only. */
export function advanceGrowth(world: EngineWorld, uid: string): void {
  const it = find(world, uid)
  if (!it || it.category !== 'flora') return
  it.scale = Math.min(GROW_MAX_SCALE, (it.scale || 1) * GROW_FACTOR)
  it.stage = 'lush'
}

/** Duplicate (prototype re-adds the def 0.05 to the right at the same y); returns the copy. */
export function duplicateItem(
  world: EngineWorld,
  uid: string,
  stage: GrowthStage,
  terrain: TerrainInput,
): PlacedItem | null {
  const it = find(world, uid)
  if (!it) return null
  return addItem(world, it.id, stage, { terrain, x: it.x + DUPLICATE_OFFSET_X, y: it.y })
}

export function deleteItem(world: EngineWorld, uid: string): void {
  world.items = world.items.filter((i) => i.uid !== uid)
}

/** Planting-stage toggle applied to the selected flora (prototype 2896-2920). Only sprout/mature are toggled. */
export function setFloraStage(world: EngineWorld, uid: string, stage: 'sprout' | 'mature'): void {
  const it = find(world, uid)
  if (!it || it.category !== 'flora') return
  const def = findCatalogDef(it.id)
  const base = def ? def.baseScale : 1
  it.stage = stage
  it.growthProgress = stage === 'sprout' ? 0.2 : 1.0
  it.scale = stage === 'sprout' ? base * SPROUT_SCALE : base
}
