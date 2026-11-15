/** Nitrogen cycle of a new pool: its length and the ammonia / nitrite curve while it cycles. */
export const CYCLE_DAYS = 21

/** Ammonia / nitrite readings (ppm) while the pool cycles; both 0 once cycled. */
export function cycleChemistry(p: number): { nh3: number; no2: number } {
  if (p >= 1) return { nh3: 0, no2: 0 }
  return {
    nh3: 3.5 * Math.exp(-Math.pow((p - 0.3) / 0.18, 2)),
    no2: 2.5 * Math.exp(-Math.pow((p - 0.62) / 0.15, 2)),
  }
}

export function cycleDay(p: number): number {
  return Math.max(1, Math.ceil(p * CYCLE_DAYS))
}
