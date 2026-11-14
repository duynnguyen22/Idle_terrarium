import type { Rect, SubstrateDepths } from '@/data/types'
import { LAND_LAYER_IDS } from '@/data/substrates'
import { isRectTank } from '@/data/vessels'
import { clamp } from '@/lib/clamp'

/** Contour is sampled across normalized x in [0.15, 0.85]. */
export const CONTOUR_X_MIN = 0.15
export const CONTOUR_X_MAX = 0.85

export const MM_TO_NORM = 0.42 / 130
/** Width (normalized x) of the sloping bank between pool bed and land. */
export const BANK_W = 0.06

export interface TerrainInput {
  substrates: Partial<SubstrateDepths>
  waterSplit: number
  terrainContour?: readonly number[]
}

/** Total land substrate depth in mm (water and river gravel excluded). */
export function getTotalSubstrateDepth(substrates: Partial<SubstrateDepths>): number {
  return LAND_LAYER_IDS.reduce((sum, id) => sum + (substrates[id] || 0), 0)
}

/** Linear interpolation of the terrain contour (mm) at normalized x; clamps outside [0.15, 0.85]. */
export function sampleContour(contour: readonly number[], nx: number): number {
  const clampedX = clamp(nx, CONTOUR_X_MIN, CONTOUR_X_MAX)
  const idxFloat =
    ((clampedX - CONTOUR_X_MIN) / (CONTOUR_X_MAX - CONTOUR_X_MIN)) * (contour.length - 1)
  const i0 = Math.floor(idxFloat)
  const i1 = Math.min(contour.length - 1, i0 + 1)
  const frac = idxFloat - i0
  return (contour[i0] || 0) * (1 - frac) + (contour[i1] || 0) * frac
}

export function hasPool(waterSplit: number): boolean {
  return (waterSplit || 0) > 0.02
}

export function getDividerNormX(waterSplit: number): number {
  return 0.15 + 0.7 * Math.min(0.6, waterSplit || 0)
}

/** Left of the middle of the bank, in the pool (prototype isInPool). False when there is no pool. */
export function isInPool(x: number, waterSplit: number): boolean {
  return hasPool(waterSplit) && x < getDividerNormX(waterSplit) - BANK_W * 0.5
}

export function getPoolBedNormY(substrates: Partial<SubstrateDepths>): number {
  return 0.92 - Math.max(2, substrates.rivergravel || 0) * MM_TO_NORM
}

export function getLandSurfaceNormY(t: TerrainInput, normX: number): number {
  const contourMm = t.terrainContour ? sampleContour(t.terrainContour, normX) : 0
  return 0.92 - (getTotalSubstrateDepth(t.substrates) + contourMm) * MM_TO_NORM
}

export function getWaterTopNormY(t: TerrainInput): number {
  const raw = getPoolBedNormY(t.substrates) - (t.substrates.water || 0) * MM_TO_NORM
  return Math.max(raw, getLandSurfaceNormY(t, getDividerNormX(t.waterSplit)) + 0.015)
}

export function poolHasWater(t: TerrainInput): boolean {
  return hasPool(t.waterSplit) && (t.substrates.water || 0) > 4
}

/** Surface an object rests on: land, the sloping bank, or the pool bed. */
export function getSoilSurfaceNormalizedY(t: TerrainInput, normX = 0.5): number {
  const land = getLandSurfaceNormY(t, normX)
  if (!hasPool(t.waterSplit)) return land
  const d = getDividerNormX(t.waterSplit)
  const bed = getPoolBedNormY(t.substrates)
  if (normX <= d - BANK_W) return bed
  if (normX < d) {
    const k = (normX - (d - BANK_W)) / BANK_W
    return bed + (getLandSurfaceNormY(t, d) - bed) * k
  }
  return land
}

export function randomLandX(t: TerrainInput, rng: () => number = Math.random): number {
  const lo = hasPool(t.waterSplit) ? getDividerNormX(t.waterSplit) + 0.03 : 0.24
  const hi = 0.76
  return lo + rng() * Math.max(0.02, hi - lo)
}

/** Client pointer position to vessel-normalized coordinates (0..1 across R). */
export function toNormalized(
  clientX: number,
  clientY: number,
  canvasRect: { left: number; top: number },
  R: Rect,
): { nx: number; ny: number } {
  return {
    nx: (clientX - canvasRect.left - R.x) / R.w,
    ny: (clientY - canvasRect.top - R.y) / R.h,
  }
}

/**
 * Builds the vessel outline path. R is the vessel rect (centre = R.x + R.w/2, radius = R.h/2); rectangular
 * tanks stretch horizontally by KX = R.w / R.h (prototype 2721-2729).
 */
export function traceVesselPath(ctx: CanvasRenderingContext2D, vessel: string, R: Rect): void {
  const cx = R.x + R.w / 2
  const cy = R.y + R.h / 2
  const r = R.h / 2
  const kx = R.w / R.h
  ctx.beginPath()
  if (isRectTank(vessel)) {
    ctx.roundRect(cx - r * 0.72 * kx, cy - r * 0.84, r * 1.44 * kx, r * 1.68, 4)
    return
  }
  switch (vessel) {
    case 'wardian':
      ctx.moveTo(cx - r * 0.38, cy - r * 0.84)
      ctx.lineTo(cx + r * 0.38, cy - r * 0.84)
      ctx.lineTo(cx + r * 0.76, cy - r * 0.2)
      ctx.lineTo(cx + r * 0.76, cy + r * 0.75)
      ctx.lineTo(cx + r * 0.4, cy + r * 0.85)
      ctx.lineTo(cx - r * 0.4, cy + r * 0.85)
      ctx.lineTo(cx - r * 0.76, cy + r * 0.75)
      ctx.lineTo(cx - r * 0.76, cy - r * 0.2)
      ctx.closePath()
      break
    case 'globe':
      ctx.arc(cx, cy, r * 0.86, 0, Math.PI * 2)
      break
    case 'cylinder':
      ctx.roundRect(cx - r * 0.65, cy - r * 0.85, r * 1.3, r * 1.7, 8)
      break
    case 'teardrop':
      ctx.moveTo(cx - r * 0.22, cy - r * 0.86)
      ctx.lineTo(cx + r * 0.22, cy - r * 0.86)
      ctx.bezierCurveTo(
        cx + r * 0.38,
        cy - r * 0.35,
        cx + r * 0.88,
        cy + r * 0.15,
        cx + r * 0.8,
        cy + r * 0.65,
      )
      ctx.bezierCurveTo(
        cx + r * 0.75,
        cy + r * 0.85,
        cx + r * 0.4,
        cy + r * 0.85,
        cx,
        cy + r * 0.85,
      )
      ctx.bezierCurveTo(
        cx - r * 0.4,
        cy + r * 0.85,
        cx - r * 0.75,
        cy + r * 0.85,
        cx - r * 0.8,
        cy + r * 0.65,
      )
      ctx.bezierCurveTo(
        cx - r * 0.88,
        cy + r * 0.15,
        cx - r * 0.38,
        cy - r * 0.35,
        cx - r * 0.22,
        cy - r * 0.86,
      )
      ctx.closePath()
      break
    default:
      // apothecary
      ctx.moveTo(cx - r * 0.4, cy - r * 0.86)
      ctx.lineTo(cx + r * 0.4, cy - r * 0.86)
      ctx.bezierCurveTo(
        cx + r * 0.5,
        cy - r * 0.6,
        cx + r * 0.86,
        cy - r * 0.2,
        cx + r * 0.86,
        cy + r * 0.4,
      )
      ctx.bezierCurveTo(
        cx + r * 0.86,
        cy + r * 0.75,
        cx + r * 0.65,
        cy + r * 0.84,
        cx,
        cy + r * 0.84,
      )
      ctx.bezierCurveTo(
        cx - r * 0.65,
        cy + r * 0.84,
        cx - r * 0.86,
        cy + r * 0.75,
        cx - r * 0.86,
        cy + r * 0.4,
      )
      ctx.bezierCurveTo(
        cx - r * 0.86,
        cy - r * 0.2,
        cx - r * 0.5,
        cy - r * 0.6,
        cx - r * 0.4,
        cy - r * 0.86,
      )
      ctx.closePath()
      break
  }
}
