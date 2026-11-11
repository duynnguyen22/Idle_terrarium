import type { MossTuft, PlacedItem } from '@/data/types'
import { ensureLife } from './simulation/life'
import { TERRAIN_POINTS, type EngineWorld, type WorldEntity } from './world'

export interface WorldSnapshot {
  items: PlacedItem[]
  terrainContour: number[]
  substrateGrains?: WorldEntity[]
  mossTufts?: MossTuft[]
  ecoTime?: number
  breed?: Record<string, number>
}

export const MAX_PERSISTED_GRAINS = 180

/** Deep copy of the persistable world parts. Particles are never included. */
export function snapshotWorld(world: EngineWorld): WorldSnapshot {
  return {
    items: structuredClone(world.items),
    terrainContour: [...world.terrainContour],
    substrateGrains: structuredClone(world.surfaceGrains.slice(-MAX_PERSISTED_GRAINS)),
    mossTufts: structuredClone(world.mossTufts),
    ecoTime: world.ecoTime,
    breed: { ...world.breed },
  }
}

export function restoreWorld(world: EngineWorld, snapshot: WorldSnapshot): void {
  world.items = structuredClone(snapshot.items)
  world.terrainContour =
    snapshot.terrainContour.length === TERRAIN_POINTS
      ? [...snapshot.terrainContour]
      : new Array<number>(TERRAIN_POINTS).fill(0)
  world.surfaceGrains = snapshot.substrateGrains ? structuredClone(snapshot.substrateGrains) : []
  world.mossTufts = snapshot.mossTufts ? structuredClone(snapshot.mossTufts) : []
  world.ecoTime = snapshot.ecoTime ?? 0
  world.breed = snapshot.breed ? { ...snapshot.breed } : {}
  ensureLife(world, Math.random)
}
