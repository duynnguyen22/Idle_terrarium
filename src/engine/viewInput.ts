import type { Rect } from '@/data/types'
import { toNormalized } from './geometry'
import { hitTest } from './interaction'
import { itemBox } from './render/specimens'
import { camHome, camToBase, clampCam, zoomAt, type ViewState } from './view'
import type { EngineWorld, Point } from './world'

/**
 * Camera gestures on the canvas (prototype initView), as pure helpers over the view. Screen points are CSS px
 * from the canvas top-left; the canvas size is the one `updateCamera` last saw (`view.size`).
 */

/** A one-finger (or mouse) pan in progress. */
export interface PanState {
  /** Where the press started, and the camera centre then. */
  x: number
  y: number
  u: number
  v: number
  /** The pointer has travelled more than 3 px. */
  moved: boolean
}

/** A two-finger pinch in progress: the finger distance and zoom at the last move. */
export interface PinchState {
  d: number
  z: number
}

/** A press that travels further than this is a pan, not a tap. */
const PAN_SLOP_PX = 3

/** Wheel: zooms about the cursor. A trackpad pinch arrives as ctrl+wheel and gets the stronger factor. */
export function wheelZoom(
  view: ViewState,
  sx: number,
  sy: number,
  deltaY: number,
  ctrlKey: boolean,
): void {
  const k = ctrlKey ? 0.012 : 0.0016
  zoomAt(view, sx, sy, view.cam.z * Math.exp(-deltaY * k), true)
}

/** Starts a pan when zoomed in; null at (about) 100 %, where there is nothing to pan. Ends any close-up. */
export function beginPan(view: ViewState, sx: number, sy: number): PanState | null {
  if (view.cam.z <= 1.01) return null
  view.follow = null
  view.gesture = true
  return { x: sx, y: sy, u: view.cam.u, v: view.cam.v, moved: false }
}

/** Moves the view with the pointer: a screen drag of dx shifts the canvas centre by dx / zoom. */
export function movePan(view: ViewState, pan: PanState, sx: number, sy: number): void {
  const g = view.size
  if (!g) return
  const dx = sx - pan.x
  const dy = sy - pan.y
  if (Math.hypot(dx, dy) > PAN_SLOP_PX) pan.moved = true
  const z = view.cam.z
  Object.assign(view.camT, clampCam({ z, u: pan.u - dx / z / g.w, v: pan.v - dy / z / g.h }))
  Object.assign(view.cam, view.camT)
}

const spread = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y) || 1

/** Starts a two-finger pinch. */
export function beginPinch(view: ViewState, a: Point, b: Point): PinchState {
  view.gesture = true
  return { d: spread(a, b), z: view.cam.z }
}

/** Zooms by the change in finger distance, about the midpoint of the two fingers. */
export function movePinch(view: ViewState, pinch: PinchState, a: Point, b: Point): void {
  const d = spread(a, b)
  zoomAt(view, (a.x + b.x) / 2, (a.y + b.y) / 2, (pinch.z * d) / pinch.d, true)
  pinch.z = view.cam.z
  pinch.d = d
}

/**
 * Double-click: on an item, centre it at 240 % or deeper; on empty space, go home when zoomed, else zoom to
 * 200 % about the point.
 */
export function doubleClick(
  view: ViewState,
  world: EngineWorld,
  R: Rect,
  kx: number,
  sx: number,
  sy: number,
): void {
  const g = view.size
  if (!g) return
  const b = camToBase(view.cam, sx, sy, g.w, g.h)
  const { nx, ny } = toNormalized(b.x, b.y, { left: 0, top: 0 }, R)
  const hit = hitTest(world, nx, ny, kx)
  const box = hit ? itemBox(R, hit, view, world.items) : null
  if (box) {
    Object.assign(
      view.camT,
      clampCam({ z: Math.max(2.4, view.camT.z), u: box.x / g.w, v: box.y / g.h }),
    )
    view.follow = null
  } else if (view.camT.z > 1.05) camHome(view)
  else zoomAt(view, sx, sy, 2, false)
}
