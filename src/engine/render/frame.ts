import { isRectTank } from '@/data/vessels'
import { getLandSurfaceNormY, getWaterTopNormY } from '../geometry'
import { vesselMetrics, type RenderFn } from './metrics'
import { terrainOf } from './terrain'

/**
 * Front frame of the rectangular tanks (prototype drawPaludariumFrontFrame), spanning the tank's scaled
 * width. Rimless and riparium tanks get thin seams, edge highlights and a reflection streak (the riparium
 * also a hanging planter rail); the front-opening vivarium a black frame, top vent strip and two hinged
 * doors; the paludarium its black silicone frame, front water-dam bar and glass door knob. The dam sits
 * just above whichever is higher, the land at x = 0.6 or the pool surface, but never lower than 0.2R off
 * the floor.
 */
export const drawPaludariumFrontFrame: RenderFn = (ctx, world, state, R) => {
  if (!isRectTank(state.vessel)) return
  const { cx, cy, r: Rad, kx } = vesselMetrics(R)
  ctx.save()
  const w = Rad * 1.44 * kx
  const h = Rad * 1.68
  const leftX = cx - w / 2
  const topY = cy - Rad * 0.84
  const v = state.vessel

  if (v === 'rimless_landscape' || v === 'riparium_long') {
    // Rimless low-iron glass: thin clear silicone seams and polished edges
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.55)'
    ctx.lineWidth = 2
    ctx.strokeRect(leftX, topY, w, h)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(leftX + 3, topY + 3)
    ctx.lineTo(leftX + 3, topY + h - 3)
    ctx.moveTo(leftX + w - 3, topY + 3)
    ctx.lineTo(leftX + w - 3, topY + h - 3)
    ctx.stroke()
    // Glass reflection streak
    ctx.fillStyle = 'rgba(255, 255, 255, 0.07)'
    ctx.beginPath()
    ctx.moveTo(leftX + w * 0.7, topY)
    ctx.lineTo(leftX + w * 0.76, topY)
    ctx.lineTo(leftX + w * 0.64, topY + h)
    ctx.lineTo(leftX + w * 0.58, topY + h)
    ctx.closePath()
    ctx.fill()
    if (v === 'riparium_long') {
      // Hanging planter rail along the back top edge
      ctx.fillStyle = '#2b3a33'
      ctx.fillRect(leftX + 6, topY + 4, w - 12, 4)
    }
  } else if (v === 'vivarium_front') {
    // Black frame, mesh vent strip on top, two hinged front doors
    const ventH = Rad * 0.07
    ctx.strokeStyle = '#111827'
    ctx.lineWidth = 5
    ctx.strokeRect(leftX, topY, w, h)
    ctx.fillStyle = '#1f2937'
    ctx.fillRect(leftX, topY, w, ventH)
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.55)'
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let x = leftX + 6; x < leftX + w - 4; x += 5) {
      ctx.moveTo(x, topY + 3)
      ctx.lineTo(x, topY + ventH - 3)
    }
    ctx.stroke()
    // Centre split between the two doors
    ctx.strokeStyle = '#111827'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(cx, topY + ventH)
    ctx.lineTo(cx, topY + h * 0.62)
    ctx.stroke()
    // Door handles
    ctx.fillStyle = '#94a3b8'
    for (const x of [cx - 9, cx + 5]) {
      ctx.beginPath()
      ctx.roundRect(x, topY + h * 0.33, 4, 16, 2)
      ctx.fill()
    }
    // Lower fixed panel that holds the substrate
    ctx.fillStyle = '#111827'
    ctx.fillRect(leftX, topY + h * 0.62, w, 3)
  } else {
    const bottomY = cy + Rad * 0.84
    const t = terrainOf(world, state)
    const damY = Math.min(
      cy - Rad + Math.min(getLandSurfaceNormY(t, 0.6), getWaterTopNormY(t)) * 2 * Rad - 10,
      bottomY - Rad * 0.2,
    )

    // Black silicone structural edges
    ctx.strokeStyle = '#111827'
    ctx.lineWidth = 4.5
    ctx.strokeRect(leftX, topY, w, h)

    // Front water-dam horizontal divider bar
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(leftX, damY, w, 5.5)

    // Front glass door metallic handle knob
    const knobX = leftX + Rad * 0.11
    const knobY = damY - Rad * 0.08
    ctx.fillStyle = '#334155'
    ctx.beginPath()
    ctx.arc(knobX, knobY, 6.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#94a3b8'
    ctx.beginPath()
    ctx.arc(knobX - 1.5, knobY - 1.5, 2.5, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.restore()
}

/** Cork lid for classic jars (not the rectangular tanks or the hanging globe). */
export const drawLid: RenderFn = (ctx, _world, state, R) => {
  if (!state.hasLid || isRectTank(state.vessel) || state.vessel === 'globe') return
  const { cx, cy, r: Rad } = vesselMetrics(R)
  ctx.fillStyle = '#9a6b46'
  ctx.strokeStyle = '#5c3d24'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.roundRect(cx - Rad * 0.34, cy - Rad * 0.89, Rad * 0.68, Rad * 0.06, 6)
  ctx.fill()
  ctx.stroke()
}
