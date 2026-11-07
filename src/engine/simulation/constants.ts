/** The prototype integrates per animation frame at ~60 fps; per-frame constants are scaled by dt / FRAME_MS. */
export const FRAME_MS = 1000 / 60

export type Rng = () => number

export function frameScale(dtMs: number): number {
  return dtMs / FRAME_MS
}

/** Prototype `speedMult`: biology runs 3.5x faster at the 5x time speed, otherwise 1x. */
export function simSpeedMult(timeSpeed: number): number {
  return timeSpeed === 5 ? 3.5 : 1
}
