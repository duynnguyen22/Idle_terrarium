import { findCatalogDef } from '@/data/catalog'
import type { StudioState } from '@/store/useStudioStore'
import type { EngineWorld } from '../world'
import { frameScale, simSpeedMult, type Rng } from './constants'

export function countCleanupCrew(world: EngineWorld): number {
  return world.items.filter((i) => {
    const d = findCatalogDef(i.id)
    return d !== null && d.category === 'fauna' && d.cleansMold
  }).length
}

/**
 * Cleanup crew devours mold (prototype 2639-2660): each detritivore shrinks every patch by 0.012 per frame
 * (x3.5 at 5x speed); patches at size <= 3 vanish. Without a crew patches stay as they are.
 */
export function updateMold(
  world: EngineWorld,
  state: Pick<StudioState, 'timeSpeed'>,
  dtMs: number,
): void {
  const crew = countCleanupCrew(world)
  if (crew === 0 || world.moldPatches.length === 0) return
  const dec = 0.012 * crew * simSpeedMult(state.timeSpeed) * frameScale(dtMs)
  for (let i = world.moldPatches.length - 1; i >= 0; i--) {
    const patch = world.moldPatches[i]
    const size = (typeof patch.size === 'number' ? patch.size : 12) - dec
    patch.size = size
    if (size <= 3) world.moldPatches.splice(i, 1)
  }
}

/** "+Spore" button (prototype 3018-3024). */
export function addSporePatch(world: EngineWorld, rng: Rng = Math.random): void {
  world.moldPatches.push({ x: 0.28 + rng() * 0.44, size: 11 + rng() * 6 })
}
