import { drawSubstrateLayers } from './substrates'
import { vesselMetrics, type RenderFn } from './metrics'

/** Water phase of prototype drawSubstratesAndLake: second layer pass, then the translucent semi-aquatic water table overlay. */
export const drawWater: RenderFn = (ctx, world, state, R, timestamp) => {
  // Prototype parity: the layer loop is not phase-gated, so layers and grains are painted again over the specimens.
  drawSubstrateLayers(ctx, world, state, R, timestamp)
  if (!(state.substrates.water > 0.4)) return
  const { cx, cy, r: Rad } = vesselMetrics(R)
  const bottomY = cy + Rad * 0.84
  const scaleFactor = (Rad * 0.84) / 200

  const waterH = state.substrates.water * scaleFactor * 2.1
  const waterTopY = bottomY - waterH
  ctx.save()
  const wGrad = ctx.createLinearGradient(0, waterTopY, 0, bottomY)
  wGrad.addColorStop(0, 'rgba(56, 189, 248, 0.28)')
  wGrad.addColorStop(0.5, 'rgba(14, 165, 233, 0.38)')
  wGrad.addColorStop(1, 'rgba(3, 105, 161, 0.48)')
  ctx.fillStyle = wGrad

  ctx.beginPath()
  ctx.moveTo(cx - Rad, waterTopY)
  for (let x = cx - Rad; x <= cx + Rad; x += 18) {
    const ripple = Math.sin(x * 0.04 + timestamp * 0.003) * 1.8
    ctx.lineTo(x, waterTopY + ripple)
  }
  ctx.lineTo(cx + Rad, bottomY)
  ctx.lineTo(cx - Rad, bottomY)
  ctx.closePath()
  ctx.fill()

  // Bright meniscus water line
  ctx.strokeStyle = 'rgba(224, 242, 254, 0.72)'
  ctx.lineWidth = 2
  ctx.beginPath()
  for (let x = cx - Rad; x <= cx + Rad; x += 16) {
    const ripple = Math.sin(x * 0.04 + timestamp * 0.003) * 1.8
    if (x === cx - Rad) ctx.moveTo(x, waterTopY + ripple)
    else ctx.lineTo(x, waterTopY + ripple)
  }
  ctx.stroke()
  ctx.restore()
}
