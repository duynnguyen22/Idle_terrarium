import { vesselKX } from '@/data/vessels'
import { toNormalized } from '@/engine/geometry'
import { computeVesselRect } from '@/engine/render/renderFrame'
import { camToBase } from '@/engine/view'
import type { EngineWorld, Point } from '@/engine/world'
import { getCanvasCssSize } from '@/lib/terrariumCanvas'
import { appStore } from '@/store/appStore'
import { relaxModeAtom, vesselAtom } from '@/store/studio'

/** A client point in CSS px from the canvas top-left. */
export function localPoint(
  canvas: HTMLCanvasElement | null,
  clientX: number,
  clientY: number,
): Point {
  const rect = canvas?.getBoundingClientRect()
  return rect ? { x: clientX - rect.left, y: clientY - rect.top } : { x: 0, y: 0 }
}

/**
 * The canvas's CSS size: the one the engine hook laid the frame out in, so pointer maths and drawing agree.
 * Falls back to the element's rect before the ResizeObserver has recorded one.
 */
export function cssSize(canvas: HTMLCanvasElement): { w: number; h: number } {
  const s = getCanvasCssSize()
  if (s) return s
  const rect = canvas.getBoundingClientRect()
  return { w: rect.width, h: rect.height }
}

/** The vessel rect for a canvas of this CSS size. */
export function vesselRect(w: number, h: number) {
  return computeVesselRect(w, h, appStore.get(relaxModeAtom), vesselKX(appStore.get(vesselAtom)))
}

/**
 * The only client -> normalized conversion: undoes the camera, then maps into the vessel rect. Also records
 * the pointer for parallax (-1..1 across the canvas).
 */
export function normalize(
  canvas: HTMLCanvasElement | null,
  world: EngineWorld,
  clientX: number,
  clientY: number,
): { nx: number; ny: number } {
  if (!canvas) return { nx: 0, ny: 0 }
  const rect = canvas.getBoundingClientRect()
  const { w, h } = cssSize(canvas)
  const sx = clientX - rect.left
  const sy = clientY - rect.top
  if (w > 0 && h > 0) world.view.pointerScreen = { x: (sx / w) * 2 - 1, y: (sy / h) * 2 - 1 }
  const b = camToBase(world.view.cam, sx, sy, w, h)
  return toNormalized(b.x, b.y, { left: 0, top: 0 }, vesselRect(w, h))
}
