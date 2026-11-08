import type { Rect } from '@/data/types'
import type { StudioState } from '@/store/useStudioStore'
import type { EngineWorld } from '../world'
import { BANK_W, getDividerNormX, getLandSurfaceNormY, type TerrainInput } from '../geometry'
import { vesselMetrics } from './metrics'

/** Terrain inputs (substrate depths, pool split, contour) for the geometry helpers. */
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
  /** Horizontal stretch of the tank (1 for square vessels); the floor spans cx ± r·kx. */
  kx: number
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
  const { cx, cy, r, kx } = vesselMetrics(R)
  const bottomY = cy + r * 0.84
  const toPx = (nx: number) => R.x + nx * R.w
  const toPy = (ny: number) => cy - r + ny * 2 * r
  const divider = getDividerNormX(t.waterSplit)
  const bankTop = { x: toPx(divider), y: toPy(getLandSurfaceNormY(t, divider)) }
  const bankBottom = { x: toPx(divider - BANK_W), y: bottomY + 8 }
  const bankXAt = (y: number) =>
    bankBottom.x +
    (bankTop.x - bankBottom.x) * ((bankBottom.y - y) / Math.max(1, bankBottom.y - bankTop.y))
  return { cx, cy, r, kx, bottomY, toPx, toPy, divider, bankTop, bankBottom, bankXAt }
}
