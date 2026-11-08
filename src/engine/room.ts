import type { AirSourceId, RoomEnv, WaterSourceId } from '@/data/types'
import { clamp } from '@/lib/clamp'

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

export interface EnvModel {
  ws: WaterSource
  as: AirSource
  tds: number
  ph: number
  chlorine: number
  airRaw: number
  /** Air quality inside the tank once the lid has buffered it from the room. */
  airEff: number
  /** Water quality, 5 to 100. */
  water: number
  kind: AirKind
}

/** Turns the room settings into the water and air quality scores the care model reads. */
export function envModel(room: RoomEnv, hasLid: boolean): EnvModel {
  const ws = WATER_SOURCES[room.water] ?? WATER_SOURCES.tap_treated
  const as = AIR_SOURCES[room.air] ?? AIR_SOURCES.clean
  const tds = ws.tdsFixed ?? Math.round(room.tds * (ws.tdsMul || 1))
  const ph = room.water === 'ro' ? 6.6 : room.water === 'rain' ? 6.2 : room.ph
  const purifierBonus = room.purifier
    ? as.kind === 'particles'
      ? 28
      : as.kind === 'none'
        ? 0
        : 10
    : 0
  const airRaw = Math.min(100, as.score + purifierBonus)
  // A sealed lid buffers the tank from the room.
  const airEff = Math.round(100 - (100 - airRaw) * (hasLid ? 0.45 : 1))
  let water =
    100 - ws.chlorine * 45 - Math.max(0, tds - 250) / 5 - Math.max(0, Math.abs(ph - 7) - 0.5) * 22
  if (room.water === 'rain' && airRaw < 60) water -= 15
  water = Math.round(clamp(water, 5, 100))
  return { ws, as, tds, ph, chlorine: ws.chlorine, airRaw, airEff, water, kind: as.kind }
}

export function qualityWord(v: number): 'Good' | 'Fair' | 'Poor' | 'Harmful' {
  return v >= 80 ? 'Good' : v >= 60 ? 'Fair' : v >= 40 ? 'Poor' : 'Harmful'
}

export function qualityTier(v: number): 'good' | 'fair' | 'bad' {
  return v >= 80 ? 'good' : v >= 60 ? 'fair' : 'bad'
}
