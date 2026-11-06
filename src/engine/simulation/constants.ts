/** The prototype integrates per animation frame at ~60 fps; per-frame constants are scaled by dt / FRAME_MS. */
export const FRAME_MS = 1000 / 60

export type Rng = () => number

export function frameScale(dtMs: number): number {
  return dtMs / FRAME_MS
}
