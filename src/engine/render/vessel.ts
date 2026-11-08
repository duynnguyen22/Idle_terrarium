import { traceVesselPath } from '../geometry'
import { isLampOn } from '../simulation/clock'
import { vesselMetrics, type RenderFn } from './metrics'

/**
 * Opens the clip region of the glass vessel (caller must `ctx.save()` first and
 * `ctx.restore()` after the interior is drawn), then paints the inner glass tint.
 */
export const beginVesselClip: RenderFn = (ctx, _world, state, R) => {
  const { cx, cy, r } = vesselMetrics(R)
  traceVesselPath(ctx, state.vessel, R)
  ctx.clip()

  // Inner glass tint
  ctx.fillStyle =
    state.lighting === 'night' ? 'rgba(15, 23, 42, 0.45)' : 'rgba(255, 255, 255, 0.14)'
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
}

/** Halo LED lamp light cone inside the enclosure (over the backdrop). Call inside the vessel clip. */
export const drawLampCone: RenderFn = (ctx, _world, state, R) => {
  if (isLampOn(state)) {
    const { cx, cy, r } = vesselMetrics(R)
    const coneGrad = ctx.createRadialGradient(cx, cy - r * 0.85, 10, cx, cy - r * 0.1, r * 0.95)
    coneGrad.addColorStop(0, 'rgba(255, 255, 255, 0.26)')
    coneGrad.addColorStop(0.5, 'rgba(224, 242, 254, 0.10)')
    coneGrad.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = coneGrad
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
  }
}

/** Glass enclosure rim highlight. */
export const drawVesselRim: RenderFn = (ctx, _world, state, R) => {
  ctx.save()
  traceVesselPath(ctx, state.vessel, R)
  ctx.strokeStyle =
    state.lighting === 'night' ? 'rgba(226, 232, 240, 0.32)' : 'rgba(35, 76, 53, 0.42)'
  ctx.lineWidth = 2.5
  ctx.stroke()
  ctx.restore()
}
