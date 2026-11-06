import type { CatalogDef, FaunaDef, FloraDef, HardscapeDef } from './types'

export const FLORA = [
  { id: 'peacock_fern', name: 'Blue Peacock Fern', category: 'flora', biome: 'tropical', canMountOnRock: true, idealHumidity: [65, 95], o2Rate: 1.8, baseScale: 1.05, desc: 'Iridescent blue-green Selaginella fronds.' },
  { id: 'cryptanthus_pink', name: 'Pink Earth Star', category: 'flora', biome: 'tropical', canMountOnRock: true, idealHumidity: [60, 90], o2Rate: 1.4, baseScale: 0.95, desc: 'Blush-pink star bromeliad rosette.' },
  { id: 'pogostemon_star', name: 'Starburst Pogostemon', category: 'flora', biome: 'tropical', canMountOnRock: true, idealHumidity: [60, 95], o2Rate: 1.6, baseScale: 1.0, desc: 'Lush bright-green radiating needle leaves.' },
  { id: 'subwassertang', name: 'Aquatic Lake Moss', category: 'flora', biome: 'tropical', canMountOnRock: true, idealHumidity: [70, 100], o2Rate: 1.7, baseScale: 0.95, desc: 'Translucent emerald underwater thallus tufts.' },
  { id: 'boston_fern', name: 'Sword Fern', category: 'flora', biome: 'tropical', canMountOnRock: true, idealHumidity: [60, 90], o2Rate: 1.8, baseScale: 1.05, desc: 'Arching emerald fronds for mid-canopy.' },
  { id: 'fittonia', name: 'Pink Fittonia', category: 'flora', biome: 'tropical', canMountOnRock: true, idealHumidity: [65, 92], o2Rate: 1.4, baseScale: 0.9, desc: 'Deep green leaves with rose-pink veins.' },
  { id: 'moss_mound', name: 'Pillow Moss Cushion', category: 'flora', biome: 'tropical', canMountOnRock: true, idealHumidity: [60, 95], o2Rate: 1.5, baseScale: 0.95, desc: 'Velvety dome of bright leucobryum moss.' },
  { id: 'anubias_nana', name: 'Anubias Petite', category: 'flora', biome: 'tropical', canMountOnRock: true, idealHumidity: [65, 98], o2Rate: 1.5, baseScale: 0.9, desc: 'Epiphytic rheophyte that clings to wet stones.' },
  { id: 'trailing_ivy', name: 'Creeping Fig Vine', category: 'flora', biome: 'tropical', canMountOnRock: true, idealHumidity: [55, 90], o2Rate: 1.5, baseScale: 1.0, desc: 'Trailing vine that drapes down cliff walls.' },
  { id: 'frogbit_pads', name: 'Floating Frogbit', category: 'flora', biome: 'tropical', floatsOnWater: true, idealHumidity: [65, 98], o2Rate: 1.4, baseScale: 0.9, desc: 'Floating water pads with delicate roots.' },
  { id: 'echeveria', name: 'Rosette Succulent', category: 'flora', biome: 'desert', canMountOnRock: true, idealHumidity: [25, 55], o2Rate: 1.1, baseScale: 0.9, desc: 'Sculptural blue-sage desert rosette.' },
  { id: 'barrel_cactus', name: 'Golden Barrel Cactus', category: 'flora', biome: 'desert', idealHumidity: [20, 50], o2Rate: 1.0, baseScale: 0.9, desc: 'Ribbed desert globe with golden spines.' }
] as const satisfies readonly FloraDef[]

export const HARDSCAPE = [
  {
      id: 'moss_wall_cliff',
      name: 'Living Moss Wall Cliff',
      category: 'hardscape',
      baseScale: 1.75,
      mountPoints: [
          { ox: -0.25, oy: -0.32 }, { ox: 0.0, oy: -0.35 }, { ox: 0.24, oy: -0.30 },
          { ox: -0.28, oy: -0.08 }, { ox: 0.22, oy: -0.06 },
          { ox: -0.22, oy: 0.16 }, { ox: 0.18, oy: 0.18 }
      ],
      desc: 'Sculpted vertical rainforest moss backdrop with 7 planting pockets.'
  },
  {
      id: 'root_slate_waterfall',
      name: 'Root & Slate Waterfall',
      category: 'hardscape',
      isWaterfall: true,
      baseScale: 1.65,
      mountPoints: [
          { ox: -0.22, oy: -0.28 }, { ox: 0.22, oy: -0.25 },
          { ox: -0.25, oy: 0.02 }, { ox: 0.24, oy: 0.05 },
          { ox: -0.18, oy: 0.24 }, { ox: 0.20, oy: 0.24 }
      ],
      desc: 'Weathered driftwood roots & dark slate chute with flowing cascade.'
  },
  {
      id: 'golden_river_boulders',
      name: 'Golden River Boulders',
      category: 'hardscape',
      baseScale: 1.2,
      mountPoints: [
          { ox: -0.16, oy: -0.12 }, { ox: 0.14, oy: -0.16 }, { ox: 0.0, oy: 0.06 }
      ],
      desc: 'Warm yellow-ochre shoreline boulders & river pebbles.'
  },
  {
      id: 'dragon_peak',
      name: 'Dragon Stone Spire',
      category: 'hardscape',
      baseScale: 1.45,
      mountPoints: [
          { ox: -0.14, oy: -0.26 }, { ox: 0.12, oy: -0.10 }, { ox: -0.12, oy: 0.08 }, { ox: 0.15, oy: 0.16 }
      ],
      desc: 'Tall eroded Ohko stone tower with natural crevices.'
  },
  {
      id: 'cliff_waterfall',
      name: 'Alpine Gorge Falls',
      category: 'hardscape',
      isWaterfall: true,
      baseScale: 1.55,
      mountPoints: [
          { ox: -0.24, oy: -0.24 }, { ox: 0.24, oy: -0.22 }, { ox: -0.22, oy: 0.06 }, { ox: 0.22, oy: 0.08 }
      ],
      desc: 'Layered grey slate cliff with central waterfall plunge pool.'
  },
  {
      id: 'bonsai_driftwood',
      name: 'Bonsai Driftwood Tree',
      category: 'hardscape',
      baseScale: 1.45,
      mountPoints: [
          { ox: -0.26, oy: -0.24 }, { ox: 0.0, oy: -0.30 }, { ox: 0.26, oy: -0.20 }, { ox: -0.12, oy: -0.05 }
      ],
      desc: 'Branching driftwood canopy for mounting epiphytes.'
  },
  { id: 'quartz', name: 'Rose Quartz Cluster', category: 'hardscape', glowsAtNight: true, glowColor: 'rgba(244, 114, 182, 0.45)', baseScale: 0.95, desc: 'Crystalline pink spires that shimmer at night.' },
  { id: 'amethyst_geode', name: 'Amethyst Geode', category: 'hardscape', glowsAtNight: true, glowColor: 'rgba(192, 132, 252, 0.5)', baseScale: 0.95, desc: 'Violet crystal cavern with twilight luminescence.' },
  { id: 'lantern', name: 'Stone Pagoda Lantern', category: 'hardscape', glowsAtNight: true, glowColor: 'rgba(251, 191, 36, 0.55)', baseScale: 0.95, desc: 'Miniature zen shrine lantern with warm glow.' },
  { id: 'river_stones', name: 'Grey Zen Stones', category: 'hardscape', baseScale: 1.0, mountPoints: [{ ox: 0, oy: -0.14 }], desc: 'Smooth stacked basalt river stones.' }
] as const satisfies readonly HardscapeDef[]

export const FAUNA = [
  { id: 'tree_frog', name: 'Red-Eyed Tree Frog', category: 'fauna', speed: 0.18, cleansMold: false, baseScale: 0.9, desc: 'Peaceful emerald amphibian that perches on leaves.' },
  { id: 'vampire_crab', name: 'Vampire Lagoon Crab', category: 'fauna', speed: 0.24, cleansMold: true, moldEatRate: 1.5, baseScale: 0.88, desc: 'Semi-aquatic violet crab with golden eyes.' },
  { id: 'medaka_fish', name: 'Golden Medaka Fish', category: 'fauna', speed: 0.42, swimsInWater: true, cleansMold: false, baseScale: 0.85, desc: 'Graceful ricefish that schools in the lake.' },
  { id: 'cherry_shrimp', name: 'Red Cherry Shrimp', category: 'fauna', speed: 0.35, swimsInWater: true, cleansMold: true, moldEatRate: 1.7, baseScale: 0.82, desc: 'Aquatic algae & biofilm grazer.' },
  { id: 'isopod', name: 'Dairy Cow Isopod', category: 'fauna', speed: 0.32, cleansMold: true, moldEatRate: 1.8, baseScale: 0.82, desc: 'Spotted detritivore that devours mold spores.' },
  { id: 'ducky_isopod', name: 'Rubber Ducky Isopod', category: 'fauna', speed: 0.28, cleansMold: true, moldEatRate: 1.9, baseScale: 0.82, desc: 'Adorable yellow-faced limestone isopod.' },
  { id: 'springtails', name: 'White Springtails', category: 'fauna', speed: 0.45, cleansMold: true, moldEatRate: 2.2, baseScale: 0.78, desc: 'Microscopic cleanup crew that prevents rot.' },
  { id: 'garden_snail', name: 'Amber Glass Snail', category: 'fauna', speed: 0.10, cleansMold: true, moldEatRate: 1.3, baseScale: 0.85, desc: 'Slow, meditative grazer with a spiral shell.' }
] as const satisfies readonly FaunaDef[]

export const CATALOG = { flora: FLORA, hardscape: HARDSCAPE, fauna: FAUNA } as const

export const ALL_CATALOG_DEFS: readonly CatalogDef[] = [...FLORA, ...HARDSCAPE, ...FAUNA]

export type CatalogId = (typeof ALL_CATALOG_DEFS)[number]['id']

const DEFS_BY_ID = new Map<string, CatalogDef>(ALL_CATALOG_DEFS.map((d) => [d.id, d]))

export function findCatalogDef(id: string): CatalogDef | null {
  return DEFS_BY_ID.get(id) ?? null
}
