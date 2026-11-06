import type { Rect, SubstrateDepths } from '@/data/types'
import { clamp } from '@/lib/clamp'

/** Contour is sampled across normalized x in [0.15, 0.85]. */
export const CONTOUR_X_MIN = 0.15
export const CONTOUR_X_MAX = 0.85

/** Total non-water, non-siphon substrate depth in mm. */
export function getTotalSubstrateDepth(substrates: Partial<SubstrateDepths>): number {
  return Object.entries(substrates)
    .filter(([id]) => id !== 'water' && id !== 'siphon')
    .reduce((sum, [, mm]) => sum + (mm || 0), 0)
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

/** Normalized y of the soil surface; pass `contour` and `normX` to include the sculpted terrain height. */
export function getSoilSurfaceNormalizedY(
  substrates: Partial<SubstrateDepths>,
  contour?: readonly number[],
  normX?: number,
): number {
  const normDepth = Math.min(0.45, (getTotalSubstrateDepth(substrates) / 130) * 0.42)
  const contourOffset =
    normX !== undefined && contour ? (sampleContour(contour, normX) / 130) * 0.42 : 0
  return 0.92 - normDepth - contourOffset
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

/** Builds the vessel outline path. R is the square vessel rect (centre = R.x + R.w/2, radius = R.w/2). */
export function traceVesselPath(ctx: CanvasRenderingContext2D, vessel: string, R: Rect): void {
  const cx = R.x + R.w / 2
  const cy = R.y + R.h / 2
  const r = R.w / 2
  ctx.beginPath()
  switch (vessel) {
    case 'paludarium_tank':
      ctx.roundRect(cx - r * 0.72, cy - r * 0.84, r * 1.44, r * 1.68, 4)
      break
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
