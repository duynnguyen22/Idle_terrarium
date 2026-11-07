import type { Rect } from '@/data/types'
import type { StudioState } from '@/store/useStudioStore'
import type { EngineWorld } from '../world'
import { drawBackground } from './background'
import { drawCondensation } from './condensation'
import { drawLid, drawPaludariumFrontFrame } from './frame'
import { drawLamp } from './lamp'
import { drawMist } from './mist'
import { drawParticles } from './particles'
import { drawPouring } from './pouring'
import { drawSpecimens } from './specimens'
import { drawSubstrates } from './substrates'
import { beginVesselClip, drawVesselRim } from './vessel'

/**
 * Square vessel rect inside a canvas of CSS size `canvasW x canvasH`, centred on the canvas
 * (prototype-v6 getStageGeometry): radius = min(0.62W, 0.46H), or min(0.62W, 0.48H) in relax mode,
 * so a narrow canvas fits its width and a wide one its height.
 */
export function computeVesselRect(canvasW: number, canvasH: number, relaxMode = false): Rect {
  const r = Math.min(canvasW * 0.62, canvasH * (relaxMode ? 0.48 : 0.46))
  const cx = canvasW * 0.5
  const cy = canvasH * 0.5
  return { x: cx - r, y: cy - r, w: r * 2, h: r * 2 }
}

/**
 * Draws one frame. `view` is the CSS-pixel canvas size (for the sky backdrop); when omitted it is
 * recovered from `R`, which is exact for rects produced by `computeVesselRect`.
 * The caller owns the DPR transform and save/restore around this call.
 */
export function renderFrame(
  ctx: CanvasRenderingContext2D,
  world: EngineWorld,
  state: StudioState,
  R: Rect,
  timestamp: number,
  view?: { w: number; h: number },
): void {
  const size = view ?? { w: (R.x + R.w / 2) * 2, h: (R.y + R.h / 2) * 2 }

  // 1. Sky backdrop + studio base board
  drawBackground(ctx, state, R, size)
  // 2. Overhead gooseneck halo lamp
  drawLamp(ctx, world, state, R, timestamp)

  // 3. Everything inside the glass is clipped to the vessel path
  ctx.save()
  beginVesselClip(ctx, world, state, R, timestamp)
  // 4. Land strata, pool gravel bed, bank, surface grains, moss & mold
  drawSubstrates(ctx, world, state, R, timestamp, 'soil')
  // 5. Placed flora, waterfall hardscapes & fauna
  drawSpecimens(ctx, world, state, R, timestamp)
  // 6. Translucent pool water with pump-driven ripples (nothing when there is no pool)
  drawSubstrates(ctx, world, state, R, timestamp, 'water')
  // 6B. Pour container cursor & falling material stream
  drawPouring(ctx, world, state, R, timestamp)
  // 6C. Mist spray droplets, beads on leaves & soil, spray-bottle cursor
  drawMist(ctx, world, state, R, timestamp)
  // 7. Ambient spores, micro-droplets & night fireflies
  drawParticles(ctx, world, state, R, timestamp)
  // 7B. Condensation fog & droplets on the inside of the glass
  drawCondensation(ctx, world, state, R, timestamp)
  ctx.restore()

  // 8. Glass rim, paludarium front frame, cork lid
  drawVesselRim(ctx, world, state, R, timestamp)
  drawPaludariumFrontFrame(ctx, world, state, R, timestamp)
  drawLid(ctx, world, state, R, timestamp)
}
