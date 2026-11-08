import { isLampOn } from '../simulation/clock'
import { vesselMetrics, type RenderFn } from './metrics'

/**
 * Overhead gooseneck halo LED grow lamp (prototype drawGooseneckHaloLamp). The fixture is drawn
 * whenever a lamp is fitted; its LED ring only glows while the lamp is on.
 */
export const drawLamp: RenderFn = (ctx, _world, state, R) => {
  if (!state.hasGrowLamp) return
  const { cx, cy, r: Rad, kx } = vesselMetrics(R)
  ctx.save()
  const topY = cy - Rad * 0.84
  const lampY = topY - Rad * 0.13

  // Gooseneck stem
  ctx.strokeStyle = '#1e293b'
  ctx.lineWidth = Math.max(4, Rad * 0.022)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(cx + Rad * 0.04, topY + 6)
  ctx.lineTo(cx + Rad * 0.04, lampY)
  ctx.stroke()

  // Black aluminum halo housing, a long bar over the wide tanks
  const puckW = kx > 1 ? Rad * 0.62 * kx : Rad * 0.42
  const puckH = Rad * 0.07
  ctx.fillStyle = '#0f172a'
  ctx.beginPath()
  ctx.roundRect(cx - puckW * 0.5, lampY - puckH * 0.5, puckW, puckH, 8)
  ctx.fill()

  // LED matrix ring underneath: glowing when lit, dark slate when off
  if (isLampOn(state)) {
    const ledGrad = ctx.createRadialGradient(
      cx,
      lampY + puckH * 0.45,
      2,
      cx,
      lampY + puckH * 0.45,
      puckW * 0.48,
    )
    ledGrad.addColorStop(0, '#ffffff')
    ledGrad.addColorStop(0.55, '#e0f2fe')
    ledGrad.addColorStop(1, 'rgba(56, 189, 248, 0)')
    ctx.fillStyle = ledGrad
  } else {
    ctx.fillStyle = '#334155'
  }
  ctx.beginPath()
  ctx.ellipse(cx, lampY + puckH * 0.45, puckW * 0.44, puckH * 0.28, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}
