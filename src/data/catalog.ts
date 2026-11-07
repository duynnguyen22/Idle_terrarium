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
  { id: 'tree_frog', name: 'Red-Eyed Tree Frog', category: 'fauna', speed: 0.18, habitat: 'land', nocturnal: true, idealHumidity: [50, 85], idealTemp: [20, 26], baseScale: 0.95, desc: 'Nocturnal climber. Hides under leaves by day, hunts insects at night.' },
  { id: 'vampire_crab', name: 'Vampire Crab', category: 'fauna', speed: 0.24, habitat: 'shore', nocturnal: true, needsWater: true, preyOn: ['medaka_fish', 'garden_snail'], idealHumidity: [75, 100], idealTemp: [22, 28], cleansMold: true, moldEatRate: 1.5, baseScale: 0.8, desc: 'Semi-aquatic. Needs a pool to molt; tends to prey on fish and snails.' },
  { id: 'medaka_fish', name: 'Golden Medaka Fish', category: 'fauna', speed: 0.42, habitat: 'water', aquatic: true, swimsInWater: true, idealTemp: [18, 28], cleansMold: false, baseScale: 0.8, desc: 'Hardy ricefish for the pool. Add once the water has cycled.' },
  { id: 'cherry_shrimp', name: 'Red Cherry Shrimp', category: 'fauna', speed: 0.35, habitat: 'water', aquatic: true, swimsInWater: true, idealTemp: [20, 27], cleansMold: true, moldEatRate: 1.7, baseScale: 0.72, desc: 'Grazes biofilm in the pool. Add once the water has cycled.' },
  { id: 'isopod', name: 'Dairy Cow Isopod', category: 'fauna', speed: 0.32, habitat: 'land', idealHumidity: [60, 100], cleansMold: true, moldEatRate: 1.8, baseScale: 0.66, desc: 'Breaks down leaf litter, wood and leftovers.' },
  { id: 'ducky_isopod', name: 'Rubber Ducky Isopod', category: 'fauna', speed: 0.28, habitat: 'land', idealHumidity: [60, 100], cleansMold: true, moldEatRate: 1.9, baseScale: 0.66, desc: 'Yellow-faced isopod that recycles litter.' },
  { id: 'springtails', name: 'White Springtails', category: 'fauna', speed: 0.45, habitat: 'land', idealHumidity: [65, 100], cleansMold: true, moldEatRate: 2.2, baseScale: 0.62, desc: 'Tiny cleanup crew that eats mold before it spreads.' },
  { id: 'garden_snail', name: 'Amber Glass Snail', category: 'fauna', speed: 0.10, habitat: 'land', idealHumidity: [70, 100], cleansMold: true, moldEatRate: 1.3, baseScale: 0.75, desc: 'Slow grazer with a spiral shell.' }
] as const satisfies readonly FaunaDef[]

export type FaunaId = (typeof FAUNA)[number]['id']

export const FAUNA_BY_ID: Readonly<Record<FaunaId, FaunaDef>> = Object.fromEntries(
  FAUNA.map((f) => [f.id, f]),
) as Record<FaunaId, FaunaDef>

export const CATALOG = { flora: FLORA, hardscape: HARDSCAPE, fauna: FAUNA } as const

export const ALL_CATALOG_DEFS: readonly CatalogDef[] = [...FLORA, ...HARDSCAPE, ...FAUNA]

export type CatalogId = (typeof ALL_CATALOG_DEFS)[number]['id']

const DEFS_BY_ID = new Map<string, CatalogDef>(ALL_CATALOG_DEFS.map((d) => [d.id, d]))

export function findCatalogDef(id: string): CatalogDef | null {
  return DEFS_BY_ID.get(id) ?? null
}
