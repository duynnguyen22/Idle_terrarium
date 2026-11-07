import type { GrowthStage, PumpFlow, SubstrateDepths } from './types'

/** Item template; `y` in the prototype is `soilSurfaceY + yOffset` for the preset's own substrates. */
export interface PresetItem {
  defId: string
  x: number
  yOffset: number
  scale: number
  flipX: boolean
  zIndex: number
  /** Where `yOffset` is measured from; defaults to the land surface. */
  anchor?: 'land' | 'bed' | 'waterTop'
  stage?: GrowthStage
  /** Index into the same `items` array of the item this one is mounted on. */
  parentIndex?: number
  offsetX?: number
  offsetY?: number
}

export interface BiomePreset {
  id: 'falls' | 'tropical' | 'paludarium' | 'desert'
  label: string
  substrates: SubstrateDepths
  /** Fraction of the tank width given to the pool. */
  waterSplit: number
  cycleProgress?: number
  pumpFlow?: PumpFlow
  toast: string
  /** Falls Lake uses a sine contour; other recipes level the terrain (21 zeros). */
  terrainContour: readonly number[]
  items: readonly PresetItem[]
  /** Only Falls Lake also sets the vessel and hardware (applyFallsLakePreset). */
  vessel?: 'paludarium_tank'
  hasLid?: boolean
  hasGrowLamp?: boolean
  hasFogger?: boolean
}

const FLAT_CONTOUR: readonly number[] = new Array<number>(21).fill(0)
const FALLS_CONTOUR: readonly number[] = FLAT_CONTOUR.map(
  (_, i) => Math.max(0, Math.sin(i * 0.45) * 2.5 + (i > 12 ? (i - 12) * 0.6 : 0)),
)

const M: GrowthStage = 'mature'

// Falls Lake item list (applyFallsLakePreset). Index: 0 moss wall, 1 falls, 2 boulders, 3-11 flora, 12-16 fauna.
// Mounted items carry the parent's x/yOffset plus their own offset as a rough standalone position.
const FALLS_ITEMS: readonly PresetItem[] = [
  { defId: 'moss_wall_cliff', x: 0.6, yOffset: -0.25, scale: 1.85, flipX: false, zIndex: 1 },
  { defId: 'root_slate_waterfall', x: 0.45, yOffset: -0.15, scale: 1.55, flipX: false, zIndex: 2 },
  { defId: 'golden_river_boulders', x: 0.73, yOffset: -0.03, scale: 1.2, flipX: false, zIndex: 4 },
  { defId: 'cryptanthus_pink', x: 0.72, yOffset: -0.42, scale: 1.0, flipX: false, zIndex: 6, stage: M, parentIndex: 0, offsetX: 0.12, offsetY: -0.17 },
  { defId: 'peacock_fern', x: 0.49, yOffset: -0.28, scale: 1.15, flipX: true, zIndex: 7, stage: M, parentIndex: 0, offsetX: -0.11, offsetY: -0.03 },
  { defId: 'peacock_fern', x: 0.76, yOffset: -0.26, scale: 1.05, flipX: false, zIndex: 8, stage: M, parentIndex: 0, offsetX: 0.16, offsetY: -0.01 },
  { defId: 'boston_fern', x: 0.56, yOffset: -0.13, scale: 1.05, flipX: true, zIndex: 9, stage: M, parentIndex: 1, offsetX: 0.11, offsetY: 0.02 },
  { defId: 'trailing_ivy', x: 0.45, yOffset: -0.2, scale: 1.05, flipX: false, zIndex: 10, stage: M, parentIndex: 0, offsetX: -0.15, offsetY: 0.05 },
  { defId: 'anubias_nana', x: 0.64, yOffset: -0.02, scale: 0.95, flipX: true, zIndex: 11, stage: M, parentIndex: 2, offsetX: -0.09, offsetY: 0.01 },
  { defId: 'pogostemon_star', x: 0.55, yOffset: -0.035, scale: 1.0, flipX: false, zIndex: 12, stage: M },
  { defId: 'subwassertang', x: 0.24, yOffset: -0.03, scale: 1.0, flipX: true, zIndex: 13, stage: M, anchor: 'bed' },
  { defId: 'frogbit_pads', x: 0.21, yOffset: 0, scale: 0.95, flipX: false, zIndex: 14, stage: M, anchor: 'waterTop' },
  { defId: 'cherry_shrimp', x: 0.22, yOffset: 0, scale: 0.72, flipX: false, zIndex: 20, anchor: 'waterTop' },
  { defId: 'cherry_shrimp', x: 0.27, yOffset: 0, scale: 0.72, flipX: false, zIndex: 21, anchor: 'waterTop' },
  { defId: 'vampire_crab', x: 0.4, yOffset: -0.03, scale: 0.8, flipX: false, zIndex: 22 },
  { defId: 'springtails', x: 0.66, yOffset: -0.03, scale: 0.62, flipX: false, zIndex: 23 },
  { defId: 'isopod', x: 0.58, yOffset: -0.03, scale: 0.66, flipX: false, zIndex: 24 },
]

export const BIOME_PRESETS = [
  {
    id: 'falls',
    label: '🌊 Falls Lake',
    vessel: 'paludarium_tank',
    hasLid: true,
    hasGrowLamp: true,
    hasFogger: true,
    pumpFlow: 'gentle',
    waterSplit: 0.32,
    cycleProgress: 1,
    substrates: { pebbles: 12, charcoal: 5, soil: 34, sand: 0, leaflitter: 5, rivergravel: 6, water: 45 },
    terrainContour: FALLS_CONTOUR,
    items: FALLS_ITEMS,
    toast: 'Falls Lake: 30% pool, waterfall and moss wall',
  },
  {
    id: 'tropical',
    label: '🌴 Rainforest',
    hasLid: true,
    waterSplit: 0,
    substrates: { pebbles: 14, charcoal: 6, soil: 38, sand: 0, leaflitter: 6, rivergravel: 4, water: 0 },
    terrainContour: FLAT_CONTOUR,
    items: [],
    toast: 'Rainforest: all land, sealed lid',
  },
  {
    id: 'paludarium',
    label: '💧 Lagoon',
    hasLid: true,
    waterSplit: 0.45,
    cycleProgress: 1,
    substrates: { pebbles: 12, charcoal: 5, soil: 30, sand: 0, leaflitter: 4, rivergravel: 8, water: 55 },
    terrainContour: FLAT_CONTOUR,
    items: [],
    toast: 'Lagoon: 45% pool for fish and shrimp',
  },
  {
    id: 'desert',
    label: '🌵 Arid Sand',
    hasLid: false,
    hasFogger: false,
    waterSplit: 0,
    substrates: { pebbles: 14, charcoal: 4, soil: 16, sand: 22, leaflitter: 0, rivergravel: 4, water: 0 },
    terrainContour: FLAT_CONTOUR,
    items: [],
    toast: 'Arid: open top, sand, no fogger',
  },
] as const satisfies readonly BiomePreset[]

export type PresetId = (typeof BIOME_PRESETS)[number]['id']
