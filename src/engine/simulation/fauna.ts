import { findCatalogDef } from '@/data/catalog'
import { getSoilSurfaceNormalizedY } from '../geometry'
import type { EngineWorld } from '../world'
import type { StudioState } from '@/store/useStudioStore'
import { frameScale, type Rng } from './constants'

export const FAUNA_X_MIN = 0.24
export const FAUNA_X_MAX = 0.76
const AI_STATES = ['wandering', 'resting', 'foraging', 'exploring'] as const

/** Autonomous creature AI (prototype 2594-2619). Dragged fauna are skipped; swimmers bob in the water band. */
export function updateFauna(
  world: EngineWorld,
  state: Pick<StudioState, 'timeSpeed' | 'substrates'> & Partial<Pick<StudioState, 'waterSplit'>> & { reducedMotion?: boolean },
  dtMs: number,
  timestamp = 0,
  rng: Rng = Math.random,
): void {
  const fs = frameScale(dtMs)
  const surfaceY = getSoilSurfaceNormalizedY({ substrates: state.substrates, waterSplit: state.waterSplit ?? 0 })
  for (const item of world.items) {
    if (item.category !== 'fauna' || item.uid === world.draggingId) continue
    const def = findCatalogDef(item.id)
    item.aiTimer = (item.aiTimer || 100) - fs
    if (item.aiTimer <= 0) {
      item.aiState = AI_STATES[Math.floor(rng() * AI_STATES.length)]
      item.aiTimer = 90 + rng() * 140
      const spd = (def && def.category === 'fauna' ? def.speed : 0.25) * 0.0014
      item.vx = item.aiState === 'resting' ? 0 : (rng() - 0.5) * spd
    }

    if (item.aiState !== 'resting') {
      const vx = item.vx ?? 0
      item.x += vx * (state.timeSpeed === 5 ? 2.5 : 1) * fs
      if (item.x < FAUNA_X_MIN) {
        item.x = FAUNA_X_MIN
        item.vx = vx * -1
      }
      if (item.x > FAUNA_X_MAX) {
        item.x = FAUNA_X_MAX
        item.vx = vx * -1
      }
      item.flipX = (item.vx ?? 0) < 0
    }

    if (def && def.category === 'fauna' && def.swimsInWater && state.substrates.water > 4) {
      const bob = state.reducedMotion ? 0 : Math.sin(timestamp * 0.002 + item.x * 10) * 0.015
      item.y = surfaceY + 0.04 + bob
    }
  }
}
