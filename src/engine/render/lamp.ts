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
    const warm = state.lampColor === 'warm'
    ledGrad.addColorStop(0, warm ? '#fff6e6' : '#ffffff')
    ledGrad.addColorStop(0.55, warm ? '#ffd9a0' : '#e0f2fe')
    ledGrad.addColorStop(1, warm ? 'rgba(255, 170, 70, 0)' : 'rgba(56, 189, 248, 0)')
    ctx.fillStyle = ledGrad
  } else {
    ctx.fillStyle = '#334155'
  }
  ctx.beginPath()
  ctx.ellipse(cx, lampY + puckH * 0.45, puckW * 0.44, puckH * 0.28, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/**
 * Warm light (3000 K, #FFB16E at about 35-50% strength): multiplied over the scene, plus a soft
 * glow under the lamp. White light is the screen's own white, so it casts nothing.
 */
export const drawLampTint: RenderFn = (ctx, _world, state, R) => {
  if (!isLampOn(state) || state.lampColor !== 'warm') return
  const { cx, cy, r, kx } = vesselMetrics(R)
  ctx.save()
  const x0 = cx - r * kx
  const y0 = cy - r
  const w = r * 2 * kx
  const h = r * 2
  const g = ctx.createRadialGradient(cx, cy - r * 0.85, r * 0.1, cx, cy - r * 0.2, r * 1.25 * kx)
  g.addColorStop(0, '#ffe0c5')
  g.addColorStop(1, '#ffecdb')
  ctx.globalCompositeOperation = 'multiply'
  ctx.fillStyle = g
  ctx.fillRect(x0, y0, w, h)
  ctx.globalCompositeOperation = 'screen'
  const s = ctx.createRadialGradient(cx, cy - r * 0.85, 4, cx, cy - r * 0.5, r * 0.9 * kx)
  s.addColorStop(0, 'rgba(255, 190, 110, 0.14)')
  s.addColorStop(1, 'rgba(255, 190, 110, 0)')
  ctx.fillStyle = s
  ctx.fillRect(x0, y0, w, h)
  ctx.restore()
}
