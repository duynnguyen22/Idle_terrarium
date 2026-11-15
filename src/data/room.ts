import type { AirSourceId, RoomEnv, WaterSourceId } from './types'

export interface WaterSource {
  name: string
  sub: string
  /** Chlorine load, 0 (none) to 1 (untreated tap). */
  chlorine: number
  /** Multiplier on the room's tds reading. */
  tdsMul?: number
  /** Replaces the room's tds reading outright. */
  tdsFixed?: number
}

export type AirKind = 'none' | 'particles' | 'fumes' | 'toxic'

export interface AirSource {
  name: string
  sub: string
  /** Air quality before the lid and purifier, 0 to 100. */
  score: number
  kind: AirKind
}

export const WATER_SOURCES: Record<WaterSourceId, WaterSource> = {
  tap: {
    name: 'Tap water',
    sub: 'Straight from the faucet; carries chlorine or chloramine',
    chlorine: 1,
  },
  tap_treated: {
    name: 'Tap + dechlorinator',
    sub: 'Conditioner neutralises chlorine and chloramine',
    chlorine: 0,
  },
  filtered: {
    name: 'Carbon-filtered',
    sub: 'Pitcher or under-sink filter; removes most chlorine',
    chlorine: 0.25,
    tdsMul: 0.85,
  },
  ro: {
    name: 'RO or distilled',
    sub: 'Near-pure; almost no minerals left',
    chlorine: 0,
    tdsFixed: 8,
  },
  rain: {
    name: 'Rainwater',
    sub: 'Soft and clean, unless the outdoor air is polluted',
    chlorine: 0,
    tdsFixed: 20,
  },
}

export const AIR_SOURCES: Record<AirSourceId, AirSource> = {
  clean: { name: 'Clean indoor air', sub: 'PM2.5 around 8 µg/m³', score: 100, kind: 'none' },
  traffic: {
    name: 'Near a busy road',
    sub: 'Dust and exhaust, PM2.5 around 55 µg/m³',
    score: 62,
    kind: 'particles',
  },
  smoke: {
    name: 'Cooking or incense smoke',
    sub: 'Heavy soot, PM2.5 above 100 µg/m³',
    score: 42,
    kind: 'particles',
  },
  voc: {
    name: 'Fresh paint or new furniture',
    sub: 'Solvent fumes (VOCs) for weeks',
    score: 38,
    kind: 'fumes',
  },
  aerosol: {
    name: 'Bug spray or air freshener',
    sub: 'Insecticide and fragrance droplets',
    score: 25,
    kind: 'toxic',
  },
}

export const DEFAULT_ROOM: RoomEnv = {
  water: 'tap_treated',
  tds: 180,
  ph: 7.2,
  air: 'clean',
  purifier: false,
}

export const TDS_RANGE = [20, 600] as const
export const PH_RANGE = [5.5, 8.5] as const
