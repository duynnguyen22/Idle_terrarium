import type { PlacedItem, SubstrateDepths } from '@/data/types'
import type { CareIssue } from './care'

/** Loose shape for per-frame particles; the engine narrows these in later tasks. */
export type WorldEntity = Record<string, unknown>

export interface Point {
  x: number
  y: number
}

export const TERRAIN_POINTS = 21

/** The v6 environment model: every gauge eases toward a target set by the build (prototype 3174-3213). */
export interface EnvState {
  humidity: number
  temperature: number
  soilMoisture: number
  nutrients: number
  o2: number
  condensation: number
  mistBoost: number
  cycleProgress: number
  bloomTimer: number
}

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
  /** Set when the last in-flight pour particle landed after the pour ended; the engine hook commits once and clears it. */
  pourSettled: boolean
  pointerNorm: Point
  lastTelemetryPush: number
  clockAccumulatorMs: number
  /** Substrate depth deltas (mm) accumulated by pouring, flushed to the store by the telemetry throttle. */
  pendingSubstrates: Partial<Record<keyof SubstrateDepths, number>>
  /** Live environment gauges; flushed into store telemetry by the throttle. */
  env: EnvState
  /** Tick counter (increments every tick, paused or not). */
  frame: number
  /** Latest care report; flushed into telemetry.careIssues. */
  careIssues: CareIssue[]
  /** Water split the engine wants written to the store on the next flush. */
  pendingWaterSplit?: number
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
    pourSettled: false,
    pointerNorm: { x: 0.5, y: 0.35 },
    lastTelemetryPush: 0,
    clockAccumulatorMs: 0,
    pendingSubstrates: {},
    env: {
      humidity: 82,
      temperature: 24.5,
      soilMoisture: 74,
      nutrients: 88,
      o2: 96,
      condensation: 0,
      mistBoost: 0,
      cycleProgress: 1,
      bloomTimer: 700,
    },
    frame: 0,
    careIssues: [],
  }
}
