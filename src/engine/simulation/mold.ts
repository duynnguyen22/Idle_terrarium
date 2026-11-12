import { findCatalogDef } from '@/data/catalog'
import type { StudioState } from '@/store/studio'
import { randomLandX } from '../geometry'
import type { EngineWorld } from '../world'
import { frameScale, simSpeedMult, type Rng } from './constants'

export const MOLD_BLOOM_TOAST =
  'A little white mold appeared. That is normal in a new build; the springtails will clear it.'

export function countCleanupCrew(world: EngineWorld): number {
  return world.items.filter((i) => {
    const d = findCatalogDef(i.id)
    return d !== null && d.category === 'fauna' && d.cleansMold
  }).length
}

/**
 * New-build mold bloom (prototype v6 3287-3303). `env.bloomTimer` counts down by speedMult per 60 fps frame;
 * when it crosses 0 three patches appear on land and the toast fires. The timer then stays <= 0, so the `> 0`
 * guard keeps the bloom from firing again. The cleanup crew clears patches per tank day in `slowStep`.
 */
export function updateMold(
  world: EngineWorld,
  state: Pick<StudioState, 'timeSpeed' | 'substrates' | 'waterSplit'>,
  dtMs: number,
  rng: Rng = Math.random,
  onToast?: (msg: string) => void,
): void {
  const speedMult = simSpeedMult(state.timeSpeed) * frameScale(dtMs)
  const env = world.env
  if (env.bloomTimer > 0) {
    env.bloomTimer -= speedMult
    if (env.bloomTimer <= 0) {
      for (let i = 0; i < 3; i++) {
        world.moldPatches.push({ x: randomLandX(state, rng), size: 9 + rng() * 6 })
      }
      onToast?.(MOLD_BLOOM_TOAST)
    }
  }
}

/** "+Spore" button (prototype v6 3694-3703): one patch at a random land x, size 11-17. */
export function addSporePatch(
  world: EngineWorld,
  state: Pick<StudioState, 'substrates' | 'waterSplit'>,
  rng: Rng = Math.random,
): void {
  world.moldPatches.push({ x: randomLandX(state, rng), size: 11 + rng() * 6 })
}
