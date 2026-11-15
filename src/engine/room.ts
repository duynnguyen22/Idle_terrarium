import {
  AIR_SOURCES,
  WATER_SOURCES,
  type AirKind,
  type AirSource,
  type WaterSource,
} from '@/data/room'
import type { RoomEnv } from '@/data/types'
import { clamp } from '@/lib/clamp'

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
