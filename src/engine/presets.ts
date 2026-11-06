import { BIOME_PRESETS, type PresetId } from '@/data/presets'
import { findCatalogDef } from '@/data/catalog'
import type { PlacedItem } from '@/data/types'
import { getSoilSurfaceNormalizedY } from '@/engine/geometry'
import { createItemId } from '@/lib/ids'
import type { StudioStore } from '@/store/useStudioStore'
import { TERRAIN_POINTS, type EngineWorld } from './world'

type PresetStore = Pick<StudioStore, 'setVessel' | 'toggleHardware' | 'setSubstrates'> &
  Pick<StudioStore, 'hasLid' | 'hasGrowLamp' | 'hasFogger'>

/**
 * Applies a biome preset (prototype applyFallsLakePreset and the substrate preset buttons).
 * Substrate-only presets keep the placed items and level the terrain; Falls Lake also sets the vessel and
 * hardware and replaces every item with instantiated runtime defaults.
 */
export function applyPreset(world: EngineWorld, presetId: PresetId, state: PresetStore): void {
  const preset = BIOME_PRESETS.find((p) => p.id === presetId)
  if (!preset) return

  if ('vessel' in preset) state.setVessel(preset.vessel)
  for (const key of ['hasLid', 'hasGrowLamp', 'hasFogger'] as const) {
    if (key in preset && !state[key]) state.toggleHardware(key)
  }
  state.setSubstrates(preset.substrates)

  world.terrainContour =
    preset.terrainContour.length === TERRAIN_POINTS
      ? [...preset.terrainContour]
      : new Array<number>(TERRAIN_POINTS).fill(0)
  world.surfaceGrains = []
  world.pendingSubstrates = {}

  if (preset.items.length === 0) return

  const surfaceY = getSoilSurfaceNormalizedY(preset.substrates)
  const items: PlacedItem[] = []
  for (const p of preset.items) {
    const def = findCatalogDef(p.defId)
    if (!def) continue
    const parent = 'parentIndex' in p && p.parentIndex !== undefined ? items[p.parentIndex] : undefined
    const item: PlacedItem = {
      uid: createItemId(),
      id: p.defId,
      category: def.category,
      x: p.x,
      y: surfaceY + p.yOffset,
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
        offsetX: ('offsetX' in p ? p.offsetX : undefined) ?? 0,
        offsetY: ('offsetY' in p ? p.offsetY : undefined) ?? 0,
      })
    }
    if (def.category === 'fauna') {
      Object.assign(item, { vx: 0.0003, vy: 0, aiState: 'wandering', aiTimer: 120 })
    }
    items.push(item)
  }
  world.items = items
}
