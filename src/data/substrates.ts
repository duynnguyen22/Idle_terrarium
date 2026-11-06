import type { SubstrateDepths, SubstrateLayerDef } from './types'

export const SUBSTRATE_LAYERS = [
  {
    id: 'pebbles',
    name: 'Drainage Pebbles',
    containerName: 'Pebble Scoop Jar',
    icon: '🪨',
    color: '#8c9298',
    secondaryColor: '#646a70',
    defaultHeight: 10,
    desc: 'Scatter coarse river pebbles for bottom drainage',
  },
  {
    id: 'lavarock',
    name: 'Red Lava Rock',
    containerName: 'Volcanic Grit Tin',
    icon: '🌋',
    color: '#7c3626',
    secondaryColor: '#522116',
    defaultHeight: 8,
    desc: 'Sprinkle porous red scoria bio-filter granules',
  },
  {
    id: 'charcoal',
    name: 'Activated Charcoal',
    containerName: 'Carbon Shaker',
    icon: '🖤',
    color: '#26292b',
    secondaryColor: '#141618',
    defaultHeight: 6,
    desc: 'Dust horticultural charcoal to purify water',
  },
  {
    id: 'moss',
    name: 'Sphagnum Moss',
    containerName: 'Moss Basket',
    icon: '🌿',
    color: '#5c8a32',
    secondaryColor: '#3f631f',
    defaultHeight: 8,
    desc: 'Layer spongy moisture-retaining moss fibers',
  },
  {
    id: 'soil',
    name: 'Rainforest Soil',
    containerName: 'Humus Trowel Bag',
    icon: '🌱',
    color: '#543b2a',
    secondaryColor: '#3b281b',
    defaultHeight: 16,
    desc: 'Pour rich organic tropical potting substrate',
  },
  {
    id: 'rivergravel',
    name: 'Golden River Gravel',
    containerName: 'Amber Gravel Can',
    icon: '✨',
    color: '#d4a359',
    secondaryColor: '#a67633',
    defaultHeight: 16,
    desc: 'Scatter warm golden stream pebbles & banks',
  },
  {
    id: 'sand',
    name: 'Silica & Desert Sand',
    containerName: 'Quartz Sand Bottle',
    icon: '⏳',
    color: '#e3d7bf',
    secondaryColor: '#c7b89b',
    defaultHeight: 0,
    desc: 'Trickle fine silica sand to sculpt dunes & paths',
  },
  {
    id: 'water',
    name: 'Semi-Aquatic Lake',
    containerName: 'Glass Water Pitcher',
    icon: 'Pitcher',
    color: '#38bdf8',
    secondaryColor: '#0284c7',
    defaultHeight: 24,
    desc: 'Pour fresh spring water to fill a paludarium lake',
  },
  {
    id: 'siphon',
    name: 'Siphon / Scoop Out',
    containerName: 'Siphon & Scoop',
    icon: '🥣',
    color: '#f43f5e',
    secondaryColor: '#be123c',
    defaultHeight: 0,
    desc: 'Lower water level or scoop out excess top substrate',
  },
] as const satisfies readonly SubstrateLayerDef[]

export type SubstrateId = (typeof SUBSTRATE_LAYERS)[number]['id']

/** The prototype renders its pour-container grid from every substrate layer (incl. water and siphon). */
export const POUR_CONTAINERS = SUBSTRATE_LAYERS

export const SUBSTRATES_BY_ID: Readonly<Record<SubstrateId, SubstrateLayerDef>> =
  Object.fromEntries(SUBSTRATE_LAYERS.map((l) => [l.id, l])) as Record<
    SubstrateId,
    SubstrateLayerDef
  >

/** Initial `state.substrates` of the prototype (mm). */
export const DEFAULT_SUBSTRATES: Readonly<SubstrateDepths> = {
  pebbles: 10,
  lavarock: 8,
  charcoal: 6,
  moss: 8,
  soil: 16,
  rivergravel: 16,
  sand: 0,
  water: 24,
}
