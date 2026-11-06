import { vesselMetrics, type RenderFn } from './metrics'

/** Overhead gooseneck halo LED grow lamp (prototype drawGooseneckHaloLamp). */
export const drawLamp: RenderFn = (ctx, _world, state, R) => {
  if (!state.hasGrowLamp) return
  const { cx, cy, r: Rad } = vesselMetrics(R)
  ctx.save()
  const topY = cy - Rad * 0.84
  const lampY = topY - Rad * 0.22

  // Gooseneck stem
  ctx.strokeStyle = '#1e293b'
  ctx.lineWidth = Math.max(5, Rad * 0.028)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(cx + Rad * 0.04, topY + 6)
  ctx.lineTo(cx + Rad * 0.04, lampY)
  ctx.stroke()

  // Circular black aluminum halo housing
  const puckW = Rad * 0.42
  const puckH = Rad * 0.09
  ctx.fillStyle = '#0f172a'
  ctx.beginPath()
  ctx.roundRect(cx - puckW * 0.5, lampY - puckH * 0.5, puckW, puckH, 8)
  ctx.fill()

  // Glowing LED matrix ring underneath
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
  ctx.beginPath()
  ctx.ellipse(cx, lampY + puckH * 0.45, puckW * 0.44, puckH * 0.28, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}
