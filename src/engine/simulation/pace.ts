import { PACES, type PaceId } from '@/data/pace'

export function paceMs(pace: PaceId): number {
  return PACES[pace]
}

/** Longest frame the sim integrates, so a background tab or long stall never lurches the world. */
export const MAX_FRAME_MS = 250

/**
 * Tank days advanced by one frame: the frame is capped, scaled by the time speed (0 pauses, 5 runs
 * 5x, any other value runs 1x), then divided by the pace.
 */
export function dtDayForFrame(dtMs: number, timeSpeed: number, pace: PaceId): number {
  if (timeSpeed === 0) return 0
  const mult = timeSpeed === 5 ? 5 : 1
  return (Math.min(dtMs, MAX_FRAME_MS) * mult) / paceMs(pace)
}
