import type { SubstrateDepths } from './types'

/** Item template; `y` in the prototype is `soilSurfaceY + yOffset` for the preset's own substrates. */
export interface PresetItem {
  defId: string
  x: number
  yOffset: number
  scale: number
  flipX: boolean
  zIndex: number
  /** Index into the same `items` array of the item this one is mounted on. */
  parentIndex?: number
  offsetX?: number
  offsetY?: number
}

export interface BiomePreset {
  id: 'falls' | 'tropical' | 'paludarium' | 'desert'
  label: string
  substrates: SubstrateDepths
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
const FALLS_CONTOUR: readonly number[] = FLAT_CONTOUR.map((_, i) => Math.sin(i * 0.45) * 2.5)

// Falls Lake item list (applyFallsLakePreset). Index: 0 moss wall, 1 falls, 2 boulders, 3-11 flora, 12-14 fauna.
const FALLS_ITEMS: readonly PresetItem[] = [
  { defId: 'moss_wall_cliff', x: 0.48, yOffset: -0.25, scale: 1.85, flipX: false, zIndex: 1 },
  { defId: 'root_slate_waterfall', x: 0.52, yOffset: -0.17, scale: 1.65, flipX: false, zIndex: 2 },
  { defId: 'golden_river_boulders', x: 0.65, yOffset: -0.03, scale: 1.25, flipX: false, zIndex: 4 },
  { defId: 'cryptanthus_pink', x: 0.6, yOffset: -0.42, scale: 1.0, flipX: false, zIndex: 6, parentIndex: 0, offsetX: 0.12, offsetY: -0.17 },
  { defId: 'peacock_fern', x: 0.37, yOffset: -0.28, scale: 1.15, flipX: true, zIndex: 7, parentIndex: 0, offsetX: -0.11, offsetY: -0.03 },
  { defId: 'peacock_fern', x: 0.64, yOffset: -0.26, scale: 1.05, flipX: false, zIndex: 8, parentIndex: 0, offsetX: 0.16, offsetY: -0.01 },
  { defId: 'boston_fern', x: 0.63, yOffset: -0.15, scale: 1.05, flipX: true, zIndex: 9, parentIndex: 1, offsetX: 0.11, offsetY: 0.02 },
  { defId: 'pogostemon_star', x: 0.36, yOffset: -0.06, scale: 1.15, flipX: false, zIndex: 10, parentIndex: 1, offsetX: -0.16, offsetY: 0.11 },
  { defId: 'trailing_ivy', x: 0.33, yOffset: -0.2, scale: 1.05, flipX: true, zIndex: 11, parentIndex: 0, offsetX: -0.15, offsetY: 0.05 },
  { defId: 'subwassertang', x: 0.32, yOffset: 0.06, scale: 1.05, flipX: false, zIndex: 12 },
  { defId: 'subwassertang', x: 0.67, yOffset: 0.06, scale: 1.1, flipX: true, zIndex: 13 },
  { defId: 'anubias_nana', x: 0.56, yOffset: -0.02, scale: 0.95, flipX: false, zIndex: 14, parentIndex: 2, offsetX: -0.09, offsetY: 0.01 },
  { defId: 'medaka_fish', x: 0.46, yOffset: 0.05, scale: 0.9, flipX: false, zIndex: 20 },
  { defId: 'cherry_shrimp', x: 0.58, yOffset: 0.07, scale: 0.9, flipX: false, zIndex: 21 },
  { defId: 'vampire_crab', x: 0.62, yOffset: -0.02, scale: 0.9, flipX: false, zIndex: 22 },
]

export const BIOME_PRESETS = [
  {
    id: 'falls',
    label: '🌊 Falls Lake',
    vessel: 'paludarium_tank',
    hasLid: true,
    hasGrowLamp: true,
    hasFogger: true,
    substrates: { pebbles: 10, lavarock: 8, charcoal: 6, moss: 8, soil: 14, rivergravel: 16, sand: 0, water: 26 },
    terrainContour: FALLS_CONTOUR,
    items: FALLS_ITEMS,
  },
  {
    id: 'tropical',
    label: '🌴 Rainforest',
    substrates: { pebbles: 12, lavarock: 10, charcoal: 8, moss: 12, soil: 26, rivergravel: 6, sand: 0, water: 0 },
    terrainContour: FLAT_CONTOUR,
    items: [],
  },
  {
    id: 'paludarium',
    label: '💧 Lagoon',
    substrates: { pebbles: 10, lavarock: 8, charcoal: 6, moss: 8, soil: 14, rivergravel: 18, sand: 0, water: 28 },
    terrainContour: FLAT_CONTOUR,
    items: [],
  },
  {
    id: 'desert',
    label: '🌵 Arid Sand',
    substrates: { pebbles: 10, lavarock: 8, charcoal: 4, moss: 0, soil: 10, rivergravel: 12, sand: 28, water: 0 },
    terrainContour: FLAT_CONTOUR,
    items: [],
  },
] as const satisfies readonly BiomePreset[]

export type PresetId = (typeof BIOME_PRESETS)[number]['id']
