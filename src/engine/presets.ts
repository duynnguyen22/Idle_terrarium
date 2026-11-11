import { BIOME_PRESETS, type PresetId, type PresetItem } from '@/data/presets'
import { findCatalogDef } from '@/data/catalog'
import type { PlacedItem } from '@/data/types'
import {
  getLandSurfaceNormY,
  getPoolBedNormY,
  getSoilSurfaceNormalizedY,
  getWaterTopNormY,
  type TerrainInput,
} from '@/engine/geometry'
import { mutateWorld } from '@/engine/engineBridge'
import { createItemId } from '@/lib/ids'
import { useStudioStore, type StudioStore } from '@/store/useStudioStore'
import { TERRAIN_POINTS, type EngineWorld } from './world'

/** Falls Lake's new-build mold bloom countdown (prototype applyFallsLakePreset `state.bloomTimer = 700`). */
export const FALLS_BLOOM_TIMER = 700
/** The prototype measures every 'land'-anchored preset item from the land surface at this x (`sY`). */
const LAND_REF_X = 0.6

type PresetStore = Pick<
  StudioStore,
  | 'setVessel'
  | 'setHardware'
  | 'setPumpFlow'
  | 'setWaterSplit'
  | 'setCycleProgress'
  | 'setSetupDay'
  | 'setSubstrates'
  | 'dayCount'
>

function anchorY(p: PresetItem, t: TerrainInput): number {
  switch (p.anchor) {
    case 'bed':
      return getPoolBedNormY(t.substrates)
    case 'waterTop':
      return getWaterTopNormY(t)
    case 'surface':
      return getSoilSurfaceNormalizedY(t, p.x)
    default:
      return getLandSurfaceNormY(t, LAND_REF_X)
  }
}

/**
 * Applies a biome preset (prototype v6 applyFallsLakePreset 1698-1757 and the recipe buttons 3607-3640) and
 * returns its toast. Recipes set substrates, pool split and hardware, level the terrain and clear the surface
 * grains but keep the placed items. Falls Lake also sets vessel, pump and cycle, restarts the build clock
 * (setupDay, mold bloom), clears mold and replaces every item with mature instances placed by anchor.
 */
export function applyPreset(world: EngineWorld, presetId: PresetId, store: PresetStore): string {
  const preset = BIOME_PRESETS.find((p) => p.id === presetId)
  if (!preset) return ''

  if ('vessel' in preset) store.setVessel(preset.vessel)
  for (const key of ['hasLid', 'hasGrowLamp', 'hasFogger'] as const) {
    if (key in preset) store.setHardware(key, (preset as Record<typeof key, boolean>)[key])
  }
  if ('pumpFlow' in preset) store.setPumpFlow(preset.pumpFlow)
  store.setWaterSplit(preset.waterSplit)
  if ('cycleProgress' in preset) {
    store.setCycleProgress(preset.cycleProgress)
    // The env -> store flush is one-way, so the live gauge must be set too.
    world.env.cycleProgress = preset.cycleProgress
  }
  store.setSubstrates(preset.substrates)

  world.terrainContour =
    preset.terrainContour.length === TERRAIN_POINTS
      ? [...preset.terrainContour]
      : new Array<number>(TERRAIN_POINTS).fill(0)
  world.surfaceGrains = []
  world.pendingSubstrates = {}
  delete world.pendingWaterSplit

  if (preset.items.length === 0) return preset.toast

  // A rebuilt scene keeps nothing of the old one's living state.
  world.moldPatches = []
  world.mossTufts = []
  world.breed = {}
  store.setSetupDay(store.dayCount)
  world.env.bloomTimer = FALLS_BLOOM_TIMER

  const terrain: TerrainInput = {
    substrates: preset.substrates,
    waterSplit: preset.waterSplit,
    terrainContour: world.terrainContour,
  }
  const items: PlacedItem[] = []
  for (const p of preset.items) {
    const def = findCatalogDef(p.defId)
    if (!def) continue
    const parent = p.parentIndex !== undefined ? items[p.parentIndex] : undefined
    const item: PlacedItem = {
      uid: createItemId(),
      id: p.defId,
      category: def.category,
      x: p.x,
      y: anchorY(p, terrain) + p.yOffset,
      scale: p.scale,
      rotation: 0,
      flipX: p.flipX,
      zIndex: p.zIndex,
    }
    if (def.category === 'hardscape' && def.isWaterfall) item.isWaterfall = true
    if (def.category === 'flora') {
      Object.assign(item, {
        stage: 'mature',
        growthProgress: 0.85,
        vitality: 98,
        parentUid: parent?.uid ?? null,
        offsetX: p.offsetX ?? 0,
        offsetY: p.offsetY ?? 0,
      })
    }
    if (def.category === 'fauna') {
      Object.assign(item, { vx: 0.0003, vy: 0, aiState: 'wandering', aiTimer: 120 })
    }
    items.push(item)
  }
  world.items = items
  return preset.toast
}

/**
 * First-run seeding (prototype window.onload ~3333-3336): when there is no saved scene or it has no items,
 * load the Falls Lake preset through the same path as the Biome button. Returns true when it seeded.
 * Call after the world is registered with the bridge.
 */
export function seedInitialScene(world: EngineWorld): boolean {
  if (world.items.length > 0) return false
  mutateWorld((w) => {
    applyPreset(w, 'falls', useStudioStore.getState())
  })
  return true
}
