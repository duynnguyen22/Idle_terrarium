import type { Rect } from '@/data/types'
import type { StudioState } from '@/store/useStudioStore'
import type { EngineWorld, WorldEntity } from '../world'

/** Every render function is pure and shares this signature. */
export type RenderFn = (
  ctx: CanvasRenderingContext2D,
  world: EngineWorld,
  state: StudioState,
  R: Rect,
  timestamp: number,
) => void

/**
 * Prototype drawing math is written against the vessel centre, radius (R = half the rect's height) and the
 * tank's horizontal stretch KX (rect width / height; 1 for every square vessel).
 */
export function vesselMetrics(R: Rect): { cx: number; cy: number; r: number; kx: number } {
  return { cx: R.x + R.w / 2, cy: R.y + R.h / 2, r: R.h / 2, kx: R.w / R.h }
}

/** Maps a normalized x (0..1 across the vessel rect) to pixels. */
export const normToPx = (R: Rect, nx: number) => R.x + nx * R.w
/** Maps a normalized y (0..1 down the vessel rect) to pixels. */
export const normToPy = (R: Rect, ny: number) => R.y + ny * R.h

/** Reads a numeric field of a loosely typed particle; missing or non-numeric values read as `fallback`. */
export function num(entity: WorldEntity, key: string, fallback = 0): number {
  const v = entity[key]
  return typeof v === 'number' ? v : fallback
}

export function str(entity: WorldEntity, key: string, fallback = ''): string {
  const v = entity[key]
  return typeof v === 'string' ? v : fallback
}
