import { findCatalogDef } from '@/data/catalog'
import type { StudioState, StudioStore } from '@/store/useStudioStore'
import type { EngineWorld } from '../world'
import { frameScale } from './constants'

export function growthSpeedMult(timeSpeed: number): number {
  return timeSpeed === 5 ? 3.5 : 1
}

/**
 * Sprout -> mature growth (prototype 2623-2637). Progress rises 0.00025 per 60 fps frame (x3.5 at 5x speed).
 * Only +1 Day promotes plants to `lush`; there is no timer for it in the prototype.
 */
export function updateGrowth(
  world: EngineWorld,
  state: Pick<StudioState, 'timeSpeed'>,
  dtMs: number,
): void {
  const speedMult = growthSpeedMult(state.timeSpeed) * frameScale(dtMs)
  for (const item of world.items) {
    if (item.category !== 'flora' || item.stage !== 'sprout') continue
    item.growthProgress = (item.growthProgress || 0.2) + 0.00025 * speedMult
    const def = findCatalogDef(item.id)
    const base = def ? def.baseScale : 1.0
    item.scale = base * (0.58 + Math.min(0.42, item.growthProgress * 0.42))
    if (item.growthProgress >= 1.0) {
      item.stage = 'mature'
      item.scale = base
    }
  }
}

/** `+1 Day` button: every flora grows 6% (cap 1.5) and becomes lush; dayCount + 1 via the store. */
export function advanceDay(world: EngineWorld, store: Pick<StudioStore, 'advanceDay'>): void {
  store.advanceDay()
  for (const item of world.items) {
    if (item.category === 'flora') {
      item.scale = Math.min(1.5, (item.scale || 1) * 1.06)
      item.stage = 'lush'
    }
  }
}
