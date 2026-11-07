import type { SubstrateDepths, SubstrateLayerDef } from './types'

export const SUBSTRATE_LAYERS = [
  {
    id: 'pebbles',
    name: 'Drainage layer (LECA)',
    containerName: 'LECA Scoop Jar',
    icon: '🪨',
    color: '#9b8e80',
    secondaryColor: '#6b6056',
    defaultHeight: 12,
    desc: 'Clay balls under the mesh hold excess water away from roots',
  },
  {
    id: 'charcoal',
    name: 'Activated charcoal',
    containerName: 'Carbon Shaker',
    icon: '🖤',
    color: '#2a2d2f',
    secondaryColor: '#16181a',
    defaultHeight: 5,
    desc: 'Absorbs odours and gases from decaying matter',
  },
  {
    id: 'soil',
    name: 'Tropical substrate',
    containerName: 'Substrate Bag',
    icon: '🌱',
    color: '#543b2a',
    secondaryColor: '#3b281b',
    defaultHeight: 34,
    desc: 'Coir, bark and peat-free mix where roots grow',
  },
  {
    id: 'sand',
    name: 'Silica sand',
    containerName: 'Quartz Sand Bottle',
    icon: '⏳',
    color: '#e3d7bf',
    secondaryColor: '#c7b89b',
    defaultHeight: 0,
    desc: 'Top dressing for arid builds and paths',
  },
  {
    id: 'leaflitter',
    name: 'Leaf litter',
    containerName: 'Leaf Litter Bag',
    icon: '🍂',
    color: '#8a5a2b',
    secondaryColor: '#5e3b1a',
    defaultHeight: 5,
    desc: 'Magnolia and oak leaves: food and cover for the cleanup crew',
  },
  {
    id: 'rivergravel',
    name: 'Pool gravel',
    containerName: 'River Gravel Can',
    icon: '✨',
    color: '#d4a359',
    secondaryColor: '#a67633',
    defaultHeight: 6,
    desc: 'Rounded gravel for the pool bed and shoreline',
  },
  {
    id: 'water',
    name: 'Pool water',
    containerName: 'Glass Water Pitcher',
    icon: 'Pitcher',
    color: '#38bdf8',
    secondaryColor: '#0284c7',
    defaultHeight: 45,
    desc: 'Fresh water for the pool section',
  },
  {
    id: 'siphon',
    name: 'Siphon / scoop out',
    containerName: 'Siphon & Scoop',
    icon: '🥣',
    color: '#f43f5e',
    secondaryColor: '#be123c',
    defaultHeight: 0,
    desc: 'Lower the water or scoop out the top layer',
  },
] as const satisfies readonly SubstrateLayerDef[]

export type SubstrateId = (typeof SUBSTRATE_LAYERS)[number]['id']

/** Layers poured on the land side of the tank (bottom to top). */
export const LAND_LAYER_IDS = ['pebbles', 'charcoal', 'soil', 'sand', 'leaflitter'] as const

/** The pour-container grid renders every substrate layer (incl. water and siphon). */
export const POUR_CONTAINERS = SUBSTRATE_LAYERS

export const SUBSTRATES_BY_ID: Readonly<Record<SubstrateId, SubstrateLayerDef>> =
  Object.fromEntries(SUBSTRATE_LAYERS.map((l) => [l.id, l])) as Record<
    SubstrateId,
    SubstrateLayerDef
  >

/** Initial `state.substrates` (mm). */
export const DEFAULT_SUBSTRATES: Readonly<SubstrateDepths> = {
  pebbles: 12,
  charcoal: 5,
  soil: 34,
  sand: 0,
  leaflitter: 5,
  rivergravel: 6,
  water: 45,
}
