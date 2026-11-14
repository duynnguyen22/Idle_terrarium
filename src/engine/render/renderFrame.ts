import type { Rect } from '@/data/types'
import type { StudioState } from '@/store/studio'
import { applyCamera } from '../view'
import type { EngineWorld } from '../world'
import { getCustomBackdrop } from '@/lib/backdropPhoto'
import { drawBaseBoard, drawSky } from './background'
import { drawMiniatureBackdrop } from './backdrop'
import { drawCondensation, drawMineralSpots } from './condensation'
import { drawGlassDepth, planeShiftFor } from './depth'
import { drawLid, drawPaludariumFrontFrame } from './frame'
import { drawLamp } from './lamp'
import { vesselMetrics } from './metrics'
import { drawMist } from './mist'
import { drawParticles } from './particles'
import { drawPouring } from './pouring'
import { drawMarks } from './marks'
import { drawSpecimens } from './specimens'
import { drawSubstrates } from './substrates'
import { beginVesselClip, drawLampCone, drawVesselRim } from './vessel'

/**
 * Vessel rect inside a canvas of CSS size `canvasW x canvasH`, centred on the canvas (prototype
 * getStageGeometry 1966-1970): radius = min(0.62W / max(1, 0.92·kx), 0.46H), or 0.48H in relax mode, so a
 * narrow canvas fits its width and a wide one its height. The rect is 2r tall and 2r·kx wide (square at kx = 1).
 */
export function computeVesselRect(
  canvasW: number,
  canvasH: number,
  relaxMode = false,
  kx = 1,
): Rect {
  const r = Math.min((canvasW * 0.62) / Math.max(1, kx * 0.92), canvasH * (relaxMode ? 0.48 : 0.46))
  const cx = canvasW * 0.5
  const cy = canvasH * 0.5
  return { x: cx - r * kx, y: cy - r, w: 2 * r * kx, h: 2 * r }
}

/**
 * Draws one frame. `view` is the CSS-pixel canvas size (for the sky and the camera); when omitted it is
 * recovered from `R`, which is exact for rects produced by `computeVesselRect`.
 * The sky is drawn flat; everything from the base board to the lid is drawn through `world.view.cam`.
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

  // 1. Sky backdrop (not zoomed), then the camera for everything else, starting with the base board
  drawSky(ctx, state, size)
  ctx.save()
  applyCamera(ctx, world.view.cam, size.w, size.h)
  drawBaseBoard(ctx, R)
  // 2. Overhead gooseneck halo lamp
  drawLamp(ctx, world, state, R, timestamp)

  // 3. Everything inside the glass is clipped to the vessel path
  ctx.save()
  beginVesselClip(ctx, world, state, R, timestamp)
  // 3A. Painted miniature landscape on the back glass, then the lamp's light cone over it. The back glass is
  // the furthest plane: with depth on it shifts most, and is drawn a touch larger so no edge shows.
  if (world.view.depthOn) {
    const { cx, cy, r } = vesselMetrics(R)
    const bs = planeShiftFor(world.view, 2, r)
    ctx.save()
    ctx.translate(cx + bs.x * 1.4, cy + bs.y * 1.4)
    ctx.scale(1.05, 1.05)
    ctx.translate(-cx, -cy)
    drawMiniatureBackdrop(ctx, state, R, getCustomBackdrop())
    ctx.restore()
  } else drawMiniatureBackdrop(ctx, state, R, getCustomBackdrop())
  drawLampCone(ctx, world, state, R, timestamp)
  // 4. Land strata, pool gravel bed, bank, surface grains, moss & mold
  drawSubstrates(ctx, world, state, R, timestamp, 'soil')
  // 5. Placed flora, waterfall hardscapes & fauna
  drawSpecimens(ctx, world, state, R, timestamp)
  // 5B. Dashed rings and pulsing pings around marked items
  drawMarks(ctx, world, state, R, timestamp)
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
  // 7C. White mineral spots left by hard-water misting
  drawMineralSpots(ctx, world, state, R, timestamp)
  ctx.restore()

  // 8. Glass rim, paludarium front frame, the pane's lit edge and reflection (depth on), cork lid
  drawVesselRim(ctx, world, state, R, timestamp)
  drawPaludariumFrontFrame(ctx, world, state, R, timestamp)
  drawGlassDepth(ctx, state, R, world.view.depthOn)
  drawLid(ctx, world, state, R, timestamp)
  ctx.restore()
}
