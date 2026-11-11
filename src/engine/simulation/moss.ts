import type { MossTuft, PlacedItem } from '@/data/types'
import type { Rng } from '@/lib/rng'
import type { EngineWorld } from '../world'

/** Tufts at which new moss widens an existing tuft instead of adding one. */
export const MOSS_TUFT_CAP = 18
/** Total tuft width that counts as full cover. */
const FULL_COVER = 18

/**
 * Spreads the carpet from a moss plant: a nearby, not-yet-full tuft widens (60%); otherwise a new tuft is
 * seeded, or at the cap a random tuft widens.
 */
export function spreadMoss(world: EngineWorld, parent: PlacedItem, rng: Rng): void {
  const tufts = world.mossTufts
  const near = tufts.find((t) => Math.abs(t.x - parent.x) < 0.09 && t.r < 1)
  if (near && rng() < 0.6) {
    near.r += 0.2
  } else if (tufts.length >= MOSS_TUFT_CAP) {
    const tuft = tufts[Math.floor(rng() * tufts.length)]
    if (tuft) tuft.r += 0.15
  } else {
    tufts.push({ x: parent.x + (rng() - 0.5) * 0.1, r: 0.35, w: 0.04 + rng() * 0.03, seed: rng() })
  }
}

/** Moss cover in percent: the summed tuft widths over 18, capped at 100. */
export function mossCover(tufts: MossTuft[]): number {
  const total = tufts.reduce((sum, t) => sum + t.r, 0)
  return Math.min(100, Math.round((total / FULL_COVER) * 100))
}
