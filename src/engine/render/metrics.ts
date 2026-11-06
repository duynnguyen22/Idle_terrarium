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

/** Prototype drawing math is written against the vessel centre and radius (R = half the square's side). */
export function vesselMetrics(R: Rect): { cx: number; cy: number; r: number } {
  return { cx: R.x + R.w / 2, cy: R.y + R.h / 2, r: R.w / 2 }
}

/** Reads a numeric field of a loosely typed particle; missing or non-numeric values read as `fallback`. */
export function num(entity: WorldEntity, key: string, fallback = 0): number {
  const v = entity[key]
  return typeof v === 'number' ? v : fallback
}

export function str(entity: WorldEntity, key: string, fallback = ''): string {
  const v = entity[key]
  return typeof v === 'string' ? v : fallback
}
