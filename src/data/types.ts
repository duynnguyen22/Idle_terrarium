/** Field names mirror the prototype (docs/reference/prototype.html) so the save importer maps 1:1. */

export type LightingId = 'dawn' | 'sunlight' | 'twilight' | 'night'
export type SoundPresetId = 'stream' | 'rain' | 'forest' | 'night' | 'piano' | 'musicbox' | 'bowls'
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
  /** Horizontal stretch of the tank interior (rectangular tanks). */
  kx?: number
  rect?: boolean
  doors?: boolean
  low?: boolean
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

/** Per-plant life-cycle position: `cyc` 0..1 through the species cycle, `n` completed cycles, `tendrils` grown shoots. */
export interface LifeState {
  cyc: number
  n: number
  tendrils: number
}

/** One tuft of the spreading moss carpet. */
export interface MossTuft {
  x: number
  r: number
  w: number
  seed: number
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
  life?: LifeState
  born?: boolean
  baby?: number
  resting?: boolean
  lush?: number
  // fauna runtime
  vx?: number
  vy?: number
  aiState?: AiState
  aiTimer?: number
}

export type WaterSourceId = 'tap' | 'tap_treated' | 'filtered' | 'ro' | 'rain'
export type AirSourceId = 'clean' | 'traffic' | 'smoke' | 'voc' | 'aerosol'
export type BackdropId =
  'none' | 'karst' | 'terraces' | 'pines' | 'alpine' | 'falls' | 'mesa' | 'custom'

/** The room the tank sits in: what goes into the water and what the lid keeps out of the air. */
export interface RoomEnv {
  water: WaterSourceId
  /** Dissolved minerals in ppm, before the source's own correction. */
  tds: number
  /** Water pH as a real number (7.2), not tenths. */
  ph: number
  air: AirSourceId
  purifier: boolean
}
