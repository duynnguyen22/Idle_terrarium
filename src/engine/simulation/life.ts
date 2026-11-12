import { findCatalogDef } from '@/data/catalog'
import type { FloraDef, PlacedItem } from '@/data/types'
import { getSoilSurfaceNormalizedY, type TerrainInput } from '@/engine/geometry'
import { createItemId } from '@/lib/ids'
import type { Rng } from '@/lib/rng'
import type { StudioState } from '@/store/studio'
import type { EngineWorld } from '../world'
import { spreadMoss } from './moss'

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

export interface LifeEvent {
  kind: EventKind
  uid: string
  id: string
}

export type Emit = (e: LifeEvent) => void

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

export const FLORA_CAP = 18
export const SPECIES_CAP = 3
export const ITEM_CAP = 70

/** Most leaf-drop motes the ambient list will hold. */
const MOTE_CAP = 48
const FROND_GROWTH = 1.02
const FROND_MAX = 1.35
const SEED_CHANCE = 0.4
const SEEDLING_SCALE = 0.62
/** Seedlings sit this far above the soil surface, like flora placed by `addItem`. */
const SEEDLING_LIFT = 0.05
/** Frames a falling leaf lives before it fades out. */
export const LEAF_TTL = 240

/** Light a bloom plant receives: a grow lamp is strong, ambient room light is weak. */
export function lightDose(state: Pick<StudioState, 'hasGrowLamp'>): number {
  return state.hasGrowLamp ? 0.55 : 0.1
}

/** How fast a plant moves through its cycle: 0 resting or struggling, 0.4 stressed, 1 healthy; blooms halve in low light. */
export function lifePace(item: PlacedItem, dose: number): number {
  if (item.resting) return 0
  const v = item.vitality ?? 100
  const pace = v > 70 ? 1 : v > 55 ? 0.4 : 0
  return LIFE[item.id]?.kind === 'bloom' && dose < 0.3 ? pace / 2 : pace
}

/** The next milestone the plant will reach, or null for an item without a life cycle. */
export function nextStep(item: PlacedItem): { name: EventKind; at: number } | null {
  const def = LIFE[item.id]
  if (!def || !item.life) return null
  return LIFE_STEPS[def.kind].find((s) => s.at > item.life!.cyc) ?? null
}

/**
 * Plants a seedling beside its parent (within 0.06 x, on the land surface). Returns null when the tank is full
 * of plants or items, or already holds three of the species.
 */
export function spawnSeedling(
  world: EngineWorld,
  parent: PlacedItem,
  rng: Rng,
  terrain: TerrainInput,
): PlacedItem | null {
  const def = findCatalogDef(parent.id) as FloraDef | undefined
  if (!def) return null
  if (world.items.length >= ITEM_CAP) return null
  let flora = 0
  let sameSpecies = 0
  for (const i of world.items) {
    if (i.category !== 'flora') continue
    flora++
    if (i.id === parent.id) sameSpecies++
  }
  if (flora >= FLORA_CAP || sameSpecies >= SPECIES_CAP) return null
  const x = parent.x + (rng() - 0.5) * 0.12
  const child: PlacedItem = {
    uid: createItemId(),
    id: parent.id,
    category: 'flora',
    x,
    y: getSoilSurfaceNormalizedY(terrain, x) - SEEDLING_LIFT,
    scale: def.baseScale * SEEDLING_SCALE,
    rotation: 0,
    flipX: false,
    stage: 'sprout',
    growthProgress: 0.2,
    vitality: 90,
    born: true,
    parentUid: null,
    offsetX: 0,
    offsetY: 0,
    zIndex: world.items.length + 1,
  }
  initLife(child, rng)
  world.items.push(child)
  return child
}

export interface LifeEnv {
  lightDose: number
  terrain: TerrainInput
}

/** The side effects of a plant reaching `step`: a seedling, a bigger frond, a runner or a moss tuft. */
export function onCrossing(
  world: EngineWorld,
  item: PlacedItem,
  step: EventKind,
  rng: Rng,
  emit: Emit,
  env: LifeEnv,
): void {
  switch (step) {
    case 'seed': {
      if (rng() < SEED_CHANCE) {
        const child = spawnSeedling(world, item, rng, env.terrain)
        if (child) emit({ kind: 'seedling', uid: child.uid, id: child.id })
      }
      break
    }
    case 'frond': {
      const base = (findCatalogDef(item.id) as FloraDef | undefined)?.baseScale ?? item.scale
      if (item.scale < base * FROND_MAX) {
        item.scale = Math.min(base * FROND_MAX, item.scale * FROND_GROWTH)
      } else if (world.ambientMotes.length < MOTE_CAP) {
        world.ambientMotes.push({
          type: 'leaf',
          x: item.x,
          y: item.y,
          vx: (rng() - 0.5) * 0.00012,
          vy: 0.0001,
          r: 1.6,
          ttl: LEAF_TTL,
          phase: rng() * Math.PI * 2,
        })
      }
      break
    }
    case 'tendril':
      if (item.life) item.life.tendrils = Math.min(4, item.life.tendrils + 1)
      break
    case 'spread':
      spreadMoss(world, item, rng)
      break
  }
}

/** Advances every life-cycle plant by `dtDay` tank days, emitting an event for each milestone crossed. */
export function lifeStep(
  world: EngineWorld,
  dtDay: number,
  rng: Rng,
  emit: Emit,
  env: LifeEnv,
): void {
  // Iterate a copy so seedlings planted mid-step wait for the next call.
  for (const item of [...world.items]) {
    const def = LIFE[item.id]
    const life = item.life
    if (!def || !life || item.baby !== undefined) continue
    const pace = lifePace(item, env.lightDose)
    if (pace === 0) continue
    // Any dt works: each pass runs to the end of the cycle (cyc 1) or the end of the delta, whichever is first.
    while (life.cyc >= 1) {
      life.cyc -= 1
      life.n++
    }
    let remaining = (dtDay / def.days) * pace
    while (remaining > 0) {
      const before = life.cyc
      const after = before + remaining
      const reach = Math.min(after, 1)
      life.cyc = reach
      for (const step of LIFE_STEPS[def.kind]) {
        if (before < step.at && reach >= step.at) {
          emit({ kind: step.name, uid: item.uid, id: item.id })
          onCrossing(world, item, step.name, rng, emit, env)
        }
      }
      if (after < 1) break
      life.cyc = 0
      life.n++
      remaining = after - 1
    }
  }
}
