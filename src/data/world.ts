import type { MossTuft, PlacedItem } from './types'

/** Loose shape for per-frame particles; the engine narrows these in later tasks. */
export type WorldEntity = Record<string, unknown>

export const TERRAIN_POINTS = 21

export interface WorldSnapshot {
  items: PlacedItem[]
  terrainContour: number[]
  substrateGrains?: WorldEntity[]
  mossTufts?: MossTuft[]
  ecoTime?: number
  breed?: Record<string, number>
}

export const MAX_PERSISTED_GRAINS = 180
