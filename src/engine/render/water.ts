import type { PumpFlow } from '@/data/types'
import { getWaterTopNormY, hasPool } from '../geometry'
import type { RenderFn } from './metrics'
import { bankGeometry, terrainOf } from './terrain'

/** Peak ripple height (px) of the pool surface for each pump setting. */
export function rippleAmplitude(pumpFlow: PumpFlow): number {
  return pumpFlow === 'strong' ? 2.8 : pumpFlow === 'off' ? 0.4 : 1.5
}

/**
 * Water phase of prototype drawSubstratesAndLake: the translucent pool left of the bank with a
 * pump-driven rippling meniscus. Draws nothing when there is no pool or it is (nearly) dry.
 */
export const drawWater: RenderFn = (ctx, world, state, R, timestamp) => {
  if (!hasPool(state.waterSplit) || !((state.substrates.water || 0) > 0.4)) return
  const t = terrainOf(world, state)
  const { cx, r, bottomY, toPy, bankXAt, bankBottom } = bankGeometry(t, R)
  const topY = toPy(getWaterTopNormY(t))
  const xEdge = bankXAt(topY)
  // Reduced motion keeps the surface flat, like the held-still flora sway.
  const amp = state.reducedMotion ? 0 : rippleAmplitude(state.pumpFlow)
  const speed = state.pumpFlow === 'strong' ? 0.006 : 0.003
  const ripple = (x: number) => Math.sin(x * 0.05 + timestamp * speed) * amp

  ctx.save()
  const wGrad = ctx.createLinearGradient(0, topY, 0, bottomY)
  wGrad.addColorStop(0, 'rgba(56, 189, 248, 0.26)')
  wGrad.addColorStop(0.5, 'rgba(14, 165, 233, 0.36)')
  wGrad.addColorStop(1, 'rgba(3, 105, 161, 0.46)')
  ctx.fillStyle = wGrad
  ctx.beginPath()
  ctx.moveTo(cx - r, topY)
  for (let x = cx - r; x <= xEdge; x += 10) ctx.lineTo(x, topY + ripple(x))
  ctx.lineTo(xEdge, topY)
  ctx.lineTo(bankBottom.x, bankBottom.y)
  ctx.lineTo(cx - r, bankBottom.y)
  ctx.closePath()
  ctx.fill()

  // Bright meniscus water line
  ctx.strokeStyle = 'rgba(224, 242, 254, 0.75)'
  ctx.lineWidth = 2
  ctx.beginPath()
  for (let x = cx - r; x <= xEdge; x += 10) {
    if (x === cx - r) ctx.moveTo(x, topY + ripple(x))
    else ctx.lineTo(x, topY + ripple(x))
  }
  ctx.stroke()
  ctx.restore()
}
