import type { PlacedItem } from '@/data/types'
import type { Rng } from '@/lib/rng'
import type { EngineWorld } from '../world'

export type LifeKind = 'bloom' | 'frond' | 'shoot' | 'moss'

export interface LifeDef {
  kind: LifeKind
  /** Tank days for one full cycle. */
  days: number
  /** Flower description for bloom plants. */
  bloom?: string
}

/** Species that run a life cycle; every other item has no `life`. */
export const LIFE: Readonly<Partial<Record<string, LifeDef>>> = {
  cryptanthus_pink: { kind: 'bloom', days: 9, bloom: 'small white flowers' },
  fittonia: { kind: 'bloom', days: 8, bloom: 'small flower spikes' },
  pogostemon_star: { kind: 'bloom', days: 10, bloom: 'lilac flower spikes' },
  anubias_nana: { kind: 'bloom', days: 11, bloom: 'a white flower' },
  frogbit_pads: { kind: 'bloom', days: 7, bloom: 'tiny white flowers' },
  echeveria: { kind: 'bloom', days: 12, bloom: 'coral flowers' },
  barrel_cactus: { kind: 'bloom', days: 14, bloom: 'a crown of flowers' },
  peacock_fern: { kind: 'frond', days: 5 },
  boston_fern: { kind: 'frond', days: 5 },
  trailing_ivy: { kind: 'shoot', days: 4 },
  moss_mound: { kind: 'moss', days: 3 },
  subwassertang: { kind: 'moss', days: 4 },
}

export type EventKind =
  | 'bud'
  | 'open'
  | 'fade'
  | 'seed'
  | 'fiddle'
  | 'frond'
  | 'tendril'
  | 'spread'
  | 'seedling'
  | 'grown'
  | 'hatch'
  | 'rest'

export type Emit = (e: { kind: EventKind; uid: string; id: string }) => void

/** Milestones of one cycle, as fractions of `cyc` in ascending order. */
export const LIFE_STEPS: Record<LifeKind, { name: EventKind; at: number }[]> = {
  bloom: [
    { name: 'bud', at: 0.5 },
    { name: 'open', at: 0.68 },
    { name: 'fade', at: 0.9 },
    { name: 'seed', at: 1 },
  ],
  frond: [
    { name: 'fiddle', at: 0.55 },
    { name: 'frond', at: 1 },
  ],
  shoot: [{ name: 'tendril', at: 1 }],
  moss: [{ name: 'spread', at: 1 }],
}

/** Gives a life-cycle species its starting `life` (staggered so plants do not bloom in lockstep). Never overwrites. */
export function initLife(item: PlacedItem, rng: Rng): void {
  if (!LIFE[item.id] || item.life) return
  item.life = { cyc: rng() * 0.45, n: 0, tendrils: 0 }
}

export function ensureLife(world: EngineWorld, rng: Rng): void {
  for (const item of world.items) initLife(item, rng)
}
