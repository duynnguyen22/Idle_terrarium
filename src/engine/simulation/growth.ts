import { findCatalogDef } from '@/data/catalog'
import type { StudioState, StudioStore } from '@/store/useStudioStore'
import { CYCLE_DAYS } from '../care'
import { hasPool, randomLandX } from '../geometry'
import type { EngineWorld } from '../world'
import { frameScale, simSpeedMult, type Rng } from './constants'

/**
 * Growth and vitality (prototype v6 3214-3228). Sprout progress rises 0.00025 per 60 fps frame (x3.5 at 5x
 * speed); only +1 Day promotes plants to `lush`. Flora with an ideal humidity range lose 0.003 vitality per
 * frame when `env.humidity` is more than 3 points outside it and regain 0.004 otherwise, clamped to [30, 100].
 */
export function updateGrowth(
  world: EngineWorld,
  state: Pick<StudioState, 'timeSpeed'>,
  dtMs: number,
): void {
  const speedMult = simSpeedMult(state.timeSpeed) * frameScale(dtMs)
  const humidity = world.env.humidity
  for (const item of world.items) {
    if (item.category !== 'flora') continue
    const def = findCatalogDef(item.id)
    if (item.stage === 'sprout') {
      item.growthProgress = (item.growthProgress || 0.2) + 0.00025 * speedMult
      const base = def ? def.baseScale : 1.0
      item.scale = base * (0.58 + Math.min(0.42, item.growthProgress * 0.42))
      if (item.growthProgress >= 1.0) {
        item.stage = 'mature'
        item.scale = base
      }
    }
    const range = def && def.category !== 'hardscape' ? def.idealHumidity : undefined
    if (range) {
      const [lo, hi] = range
      const out = humidity > hi + 3 || humidity < lo - 3
      const v = (item.vitality || 98) + (out ? -0.003 : 0.004) * speedMult
      item.vitality = Math.max(30, Math.min(100, v))
    }
  }
}

/**
 * `+1 Day` (prototype v6 3710-3722): dayCount + 1 via the store; every flora grows 6% (cap 1.5) and becomes
 * lush; a pool advances its nitrogen cycle by 1/21; during the first three days after setup there is a 60%
 * chance of one new mold patch on land; nutrients drop by 2 (floor 15). The "pool has cycled" toast belongs to
 * `updateEnvironment`, and the chime / day toast to the caller.
 */
export function advanceDay(
  world: EngineWorld,
  store: Pick<StudioStore, 'advanceDay' | 'dayCount' | 'setupDay' | 'waterSplit' | 'substrates'>,
  rng: Rng = Math.random,
): void {
  store.advanceDay()
  // `store` is a snapshot taken before the increment; the prototype tests the incremented day.
  const dayCount = store.dayCount + 1
  for (const item of world.items) {
    if (item.category === 'flora') {
      item.scale = Math.min(1.5, (item.scale || 1) * 1.06)
      item.stage = 'lush'
    }
  }
  const env = world.env
  if (hasPool(store.waterSplit) && env.cycleProgress < 1) {
    env.cycleProgress = Math.min(1, env.cycleProgress + 1 / CYCLE_DAYS)
  }
  if (dayCount - store.setupDay <= 3 && rng() < 0.6) {
    const terrain = { substrates: store.substrates, waterSplit: store.waterSplit }
    world.moldPatches.push({ x: randomLandX(terrain, rng), size: 9 + rng() * 5 })
  }
  env.nutrients = Math.max(15, env.nutrients - 2)
}
