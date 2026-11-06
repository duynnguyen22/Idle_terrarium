import { findCatalogDef } from '@/data/catalog'
import { DEFAULT_SUBSTRATES } from '@/data/substrates'
import type { GrowthStage, PlacedItem, SubstrateDepths } from '@/data/types'
import { getSoilSurfaceNormalizedY } from '@/engine/geometry'
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
  /** Substrate depths used to find the soil surface (defaults to the prototype's initial depths). */
  substrates?: SubstrateDepths
  x?: number
  y?: number
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
  options: AddItemOptions = {},
): PlacedItem | null {
  const def = findCatalogDef(defId)
  if (!def) return null
  const surfaceY = getSoilSurfaceNormalizedY(options.substrates ?? DEFAULT_SUBSTRATES)
  const spreadX = (Math.random() - 0.5) * 0.28
  const swims = def.category === 'fauna' && !!def.swimsInWater
  const isFlora = def.category === 'flora'
  const sprout = isFlora && stage === 'sprout'

  const item: PlacedItem = {
    uid: createItemId(),
    id: def.id,
    category: def.category,
    isWaterfall: def.category === 'hardscape' && !!def.isWaterfall,
    x: options.x ?? 0.5 + spreadX,
    y: options.y ?? (swims ? surfaceY + 0.05 : surfaceY - 0.04),
    scale: sprout ? def.baseScale * SPROUT_SCALE : def.baseScale,
    rotation: 0,
    flipX: Math.random() > 0.5,
    stage: isFlora ? stage : 'mature',
    growthProgress: sprout ? 0.2 : 0.8,
    vitality: 98,
    parentUid: null,
    offsetX: 0,
    offsetY: 0,
    zIndex: world.items.length + 1,
  }
  if (def.category === 'fauna') {
    item.vx = (Math.random() - 0.5) * 0.0004
    item.vy = 0
    item.aiState = 'wandering'
    item.aiTimer = 100 + Math.random() * 120
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
  substrates?: SubstrateDepths,
): PlacedItem | null {
  const it = find(world, uid)
  if (!it) return null
  return addItem(world, it.id, stage, { substrates, x: it.x + DUPLICATE_OFFSET_X, y: it.y })
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
