import type { PumpFlow, Rect } from '@/data/types'
import type { StudioState } from '@/store/useStudioStore'
import type { EngineWorld } from '../world'
import {
  BANK_W,
  getDividerNormX,
  getLandSurfaceNormY,
  getWaterTopNormY,
  hasPool,
  type TerrainInput,
} from '../geometry'
import { vesselMetrics, type RenderFn } from './metrics'

/** Peak ripple height (px) of the pool surface for each pump setting. */
export function rippleAmplitude(pumpFlow: PumpFlow): number {
  return pumpFlow === 'strong' ? 2.8 : pumpFlow === 'off' ? 0.4 : 1.5
}

export function terrainOf(world: EngineWorld, state: StudioState): TerrainInput {
  return {
    substrates: state.substrates,
    waterSplit: state.waterSplit,
    terrainContour: world.terrainContour,
  }
}

/** Shared pixel geometry of the carved bank between the pool (left) and the land (right). */
export interface BankGeometry {
  cx: number
  cy: number
  r: number
  bottomY: number
  toPx: (nx: number) => number
  toPy: (ny: number) => number
  divider: number
  bankTop: { x: number; y: number }
  bankBottom: { x: number; y: number }
  /** x of the bank line at pixel height y. */
  bankXAt: (y: number) => number
}

export function bankGeometry(t: TerrainInput, R: Rect): BankGeometry {
  const { cx, cy, r } = vesselMetrics(R)
  const bottomY = cy + r * 0.84
  const toPx = (nx: number) => cx - r + nx * 2 * r
  const toPy = (ny: number) => cy - r + ny * 2 * r
  const divider = getDividerNormX(t.waterSplit)
  const bankTop = { x: toPx(divider), y: toPy(getLandSurfaceNormY(t, divider)) }
  const bankBottom = { x: toPx(divider - BANK_W), y: bottomY + 8 }
  const bankXAt = (y: number) =>
    bankBottom.x +
    (bankTop.x - bankBottom.x) * ((bankBottom.y - y) / Math.max(1, bankBottom.y - bankTop.y))
  return { cx, cy, r, bottomY, toPx, toPy, divider, bankTop, bankBottom, bankXAt }
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
  const amp = rippleAmplitude(state.pumpFlow)
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
