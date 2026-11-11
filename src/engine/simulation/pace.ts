export type PaceId = 'brisk' | 'garden' | 'calm' | 'real'

/** Real milliseconds that make one tank day, per pace. */
export const PACES: Record<PaceId, number> = {
  brisk: 30 * 60e3,
  garden: 2 * 36e5,
  calm: 6 * 36e5,
  real: 864e5,
}

export const PACE_LABELS: Record<PaceId, string> = {
  brisk: 'Brisk',
  garden: 'Garden',
  calm: 'Calm',
  real: 'Real life',
}

export const PACE_SUBTITLES: Record<PaceId, string> = {
  brisk: '1 tank day = 30 min',
  garden: '1 tank day = 2 h',
  calm: '1 tank day = 6 h',
  real: '1 tank day = 1 day',
}

export function paceMs(pace: PaceId): number {
  return PACES[pace]
}

/** Longest frame the sim integrates, so a background tab or long stall never lurches the world. */
export const MAX_FRAME_MS = 250

/** Tank days advanced by one frame: the frame is capped, scaled by `timeSpeed`, then divided by the pace. */
export function dtDayForFrame(dtMs: number, timeSpeed: number, pace: PaceId): number {
  return (Math.min(dtMs, MAX_FRAME_MS) * timeSpeed) / paceMs(pace)
}
