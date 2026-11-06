import type { PlacedItem, SubstrateDepths } from '@/data/types'

/** Loose shape for per-frame particles; the engine narrows these in later tasks. */
export type WorldEntity = Record<string, unknown>

export interface Point {
  x: number
  y: number
}

export const TERRAIN_POINTS = 21

/** All per-frame mutable state. Never stored in Zustand. */
export interface EngineWorld {
  items: PlacedItem[]
  terrainContour: number[]
  moldPatches: WorldEntity[]
  mossCarpet: WorldEntity[]
  ambientMotes: WorldEntity[]
  evapVapors: WorldEntity[]
  mistDroplets: WorldEntity[]
  fallingDrops: WorldEntity[]
  sprayParticles: WorldEntity[]
  fireflies: WorldEntity[]
  morningMistClouds: WorldEntity[]
  substrateGrains: WorldEntity[]
  fallingStreams: WorldEntity[]
  surfaceGrains: WorldEntity[]
  draggingId: string | null
  dragOffset: Point
  hoveredSnapTarget: string | null
  isPouring: boolean
  pointerNorm: Point
  lastTelemetryPush: number
  clockAccumulatorMs: number
  /** Substrate depth deltas (mm) accumulated by pouring, flushed to the store by the telemetry throttle. */
  pendingSubstrates: Partial<Record<keyof SubstrateDepths, number>>
  /** Telemetry deltas accumulated by water landings, flushed with the throttle. */
  pendingTelemetry: { humidity: number; soilMoisture: number }
}

export function createWorld(): EngineWorld {
  return {
    items: [],
    terrainContour: new Array<number>(TERRAIN_POINTS).fill(0),
    moldPatches: [],
    mossCarpet: [],
    ambientMotes: [],
    evapVapors: [],
    mistDroplets: [],
    fallingDrops: [],
    sprayParticles: [],
    fireflies: [],
    morningMistClouds: [],
    substrateGrains: [],
    fallingStreams: [],
    surfaceGrains: [],
    draggingId: null,
    dragOffset: { x: 0, y: 0 },
    hoveredSnapTarget: null,
    isPouring: false,
    pointerNorm: { x: 0.5, y: 0.35 },
    lastTelemetryPush: 0,
    clockAccumulatorMs: 0,
    pendingSubstrates: {},
    pendingTelemetry: { humidity: 0, soilMoisture: 0 },
  }
}
