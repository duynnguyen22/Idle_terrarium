import type { RefObject } from 'react'
import { beginPan, type PanState, type PinchState } from '@/engine/viewInput'
import type { EngineWorld, Point } from '@/engine/world'

/**
 * What TerrariumCanvas's pointer handlers share: the canvas, the pointers down on it (CSS px from its
 * top-left), the camera gesture they drive, and the state setters for the cursor. Refs and setters only, so
 * every handler reads the current values at call time.
 */
export interface CanvasGesture {
  canvasRef: RefObject<HTMLCanvasElement | null>
  pointers: RefObject<Map<number, Point>>
  pan: RefObject<PanState | null>
  pinch: RefObject<PinchState | null>
  setDragging: (dragging: boolean) => void
  setPanning: (panning: boolean) => void
}

/** Starts a camera pan at `p` when the view allows one. */
export function startPan(g: CanvasGesture, world: EngineWorld, p: Point): void {
  const s = beginPan(world.view, p.x, p.y)
  if (!s) return
  g.pan.current = s
  g.setPanning(true)
}

/** Ends the camera pan, if one is running. */
export function endPan(g: CanvasGesture): void {
  if (!g.pan.current) return
  g.pan.current = null
  g.setPanning(false)
}
