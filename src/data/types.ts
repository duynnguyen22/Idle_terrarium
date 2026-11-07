/** Field names mirror the prototype (docs/reference/prototype.html) so the save importer maps 1:1. */

export type LightingId = 'dawn' | 'sunlight' | 'twilight' | 'night'
export type SoundPresetId = 'stream' | 'rain' | 'forest' | 'night'
export type GrowthStage = 'sprout' | 'mature' | 'lush'
export type PumpFlow = 'off' | 'gentle' | 'strong'
export type FaunaHabitat = 'water' | 'shore' | 'land'
export type AiState = 'wandering' | 'resting' | 'foraging' | 'exploring' | 'hiding'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface MountPoint {
  ox: number
  oy: number
}

export interface VesselDef {
  id: string
  name: string
  desc: string
  evapMultiplier: number
}

export interface SubstrateLayerDef {
  id: string
  name: string
  containerName: string
  icon: string
  color: string
  secondaryColor: string
  defaultHeight: number
  desc: string
}

interface BaseDef {
  id: string
  name: string
  baseScale: number
  desc: string
}

export interface FloraDef extends BaseDef {
  category: 'flora'
  biome: 'tropical' | 'desert'
  canMountOnRock?: boolean
  floatsOnWater?: boolean
  idealHumidity: readonly [number, number]
  o2Rate: number
}

export interface HardscapeDef extends BaseDef {
  category: 'hardscape'
  isWaterfall?: boolean
  glowsAtNight?: boolean
  glowColor?: string
  mountPoints?: readonly MountPoint[]
}

export interface FaunaDef extends BaseDef {
  category: 'fauna'
  speed: number
  habitat: FaunaHabitat
  nocturnal?: boolean
  needsWater?: boolean
  aquatic?: boolean
  swimsInWater?: boolean
  preyOn?: readonly string[]
  idealHumidity?: readonly [number, number]
  idealTemp?: readonly [number, number]
  cleansMold?: boolean
  moldEatRate?: number
}

export type CatalogDef = FloraDef | HardscapeDef | FaunaDef

export interface SubstrateDepths {
  pebbles: number
  charcoal: number
  soil: number
  sand: number
  leaflitter: number
  rivergravel: number
  water: number
}

export interface PlacedItem {
  uid: string
  id: string
  category: 'flora' | 'hardscape' | 'fauna'
  isWaterfall?: boolean
  x: number
  y: number
  scale: number
  rotation: number
  flipX: boolean
  zIndex: number
  stage?: GrowthStage
  growthProgress?: number
  vitality?: number
  parentUid?: string | null
  offsetX?: number
  offsetY?: number
  // fauna runtime
  vx?: number
  vy?: number
  aiState?: AiState
  aiTimer?: number
}
