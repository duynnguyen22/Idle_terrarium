import { BIOME_PRESETS } from '@/data/presets'
import { findCatalogDef } from '@/data/catalog'
import type { PlacedItem } from '@/data/types'
import { getSoilSurfaceNormalizedY } from '@/engine/geometry'
import { createItemId } from '@/lib/ids'
import { useStudioStore } from '@/store/useStudioStore'

/** Dev-only helper (prototype applyFallsLakePreset): applies Falls Lake settings and world items. */
export function loadFallsLake(): void {
  const preset = BIOME_PRESETS.find((p) => p.id === 'falls')
  if (!preset) return
  const store = useStudioStore.getState()
  store.setVessel('paludarium_tank')
  for (const key of ['hasLid', 'hasGrowLamp', 'hasFogger'] as const) {
    if (!useStudioStore.getState()[key]) store.toggleHardware(key)
  }
  store.setSubstrates(preset.substrates)

  const surfaceY = getSoilSurfaceNormalizedY(preset.substrates)
  const items: PlacedItem[] = []
  preset.items.forEach((p) => {
    const def = findCatalogDef(p.defId)
    if (!def) return
    const parent = p.parentIndex !== undefined ? items[p.parentIndex] : undefined
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
        offsetX: p.offsetX ?? 0,
        offsetY: p.offsetY ?? 0,
      })
    }
    if (def.category === 'fauna') {
      Object.assign(item, { vx: 0.0003, vy: 0, aiState: 'wandering', aiTimer: 120 })
    }
    items.push(item)
  })

  store.setWorldSnapshot({ items, terrainContour: [...preset.terrainContour], substrateGrains: [] })
}
