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
