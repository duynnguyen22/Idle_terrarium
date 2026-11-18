import type { Store } from 'jotai'
import { appStore } from '@/store/appStore'
import { substratesAtom, waterSplitAtom } from '@/store/studio'
import type { TerrainInput } from './geometry'
import type { EngineWorld } from './world'

/** The live terrain: substrate depths and water split from the studio atoms, contour from the world. */
export function currentTerrain(world: EngineWorld, store: Store = appStore): TerrainInput {
  return {
    substrates: store.get(substratesAtom),
    waterSplit: store.get(waterSplitAtom),
    terrainContour: world.terrainContour,
  }
}
