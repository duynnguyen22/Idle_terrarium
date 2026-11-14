import { findCatalogDef } from '@/data/catalog'
import type { Rect } from '@/data/types'
import type { StudioState } from '@/store/studio'
import { vesselMetrics } from './render/metrics'
import { itemBox } from './render/specimens'
import type { EngineWorld, Point } from './world'

/** Deepest zoom (prototype 7630). */
export const CAM_MAX = 4

/** Zoom and the canvas point (0..1 across and down the canvas) at the screen centre. */
export interface Cam {
  z: number
  u: number
  v: number
}

/** Camera and drawing flags the engine reads each frame. Never persisted. */
export interface ViewState {
  /** The camera as drawn; it eases toward `camT`. */
  cam: Cam
  camT: Cam
  /** A close-up that follows these items until `until` (rAF clock), then returns to `saved`. */
  follow: { uids: string[]; z: number; until: number } | null
  saved: Cam | null
  /** Panning or pinching: the camera snaps to the target. */
  gesture: boolean
  /** Eased parallax, about -1.6..1.6. */
  par: Point
  /** Pointer position, -1..1 across the canvas. */
  pointerScreen: Point | null
  /** CSS-pixel canvas size seen by the last `updateCamera`. */
  size: { w: number; h: number } | null
  /** The phone start has run (or been skipped on a wide screen). */
  framedOnce: boolean
  /** Planes, soft shadows, haze and glass. */
  depthOn: boolean
  /** Plain smoothing and graphics-card sprites. */
  fastDraw: boolean
  /** Fraction of the full backing-store resolution. */
  renderScale: number
}

const home = (): Cam => ({ z: 1, u: 0.5, v: 0.5 })

export function createView(): ViewState {
  return {
    cam: home(),
    camT: home(),
    follow: null,
    saved: null,
    gesture: false,
    par: { x: 0, y: 0 },
    pointerScreen: null,
    size: null,
    framedOnce: false,
    depthOn: true,
    fastDraw: true,
    renderScale: 1,
  }
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

/** Keeps the zoom in 1..CAM_MAX and the visible window inside the canvas. Mutates and returns `c`. */
export function clampCam(c: Cam): Cam {
  c.z = clamp(c.z, 1, CAM_MAX)
  const m = 0.5 / c.z
  c.u = clamp(c.u, m, 1 - m)
  c.v = clamp(c.v, m, 1 - m)
  return c
}

/** A screen point (CSS px in a W x H canvas) to the same point with the camera undone. */
export function camToBase(c: Cam, sx: number, sy: number, W: number, H: number): Point {
  return { x: (sx - W / 2) / c.z + c.u * W, y: (sy - H / 2) / c.z + c.v * H }
}

/** Multiplies the camera onto `ctx`: canvas point (u·W, v·H) lands at the screen centre, scaled by z. */
export function applyCamera(ctx: CanvasRenderingContext2D, c: Cam, W: number, H: number): void {
  ctx.translate(W / 2, H / 2)
  ctx.scale(c.z, c.z)
  ctx.translate(-c.u * W, -c.v * H)
}

/** Zooms the target to `z`, keeping the canvas point under (sx, sy) where it is. Ends any close-up. */
export function zoomAt(view: ViewState, sx: number, sy: number, z: number, snap: boolean): void {
  const g = view.size
  if (!g) return
  const t = view.camT
  if (snap) Object.assign(t, view.cam)
  const b = camToBase(t, sx, sy, g.w, g.h)
  t.z = clamp(z, 1, CAM_MAX)
  t.u = (b.x - (sx - g.w / 2) / t.z) / g.w
  t.v = (b.y - (sy - g.h / 2) / t.z) / g.h
  clampCam(t)
  if (snap) Object.assign(view.cam, t)
  view.follow = null
}

/** Shows the whole tank. */
export function camHome(view: ViewState): void {
  Object.assign(view.camT, home())
  view.follow = null
}

/**
 * Crops the empty air: fits the planted band, the soil and the pool (prototype camFramePlants). On a narrow
 * screen the sides may crop so the plants get the height.
 */
export function framePlants(view: ViewState, world: EngineWorld, R: Rect): void {
  const g = view.size
  if (!g) return
  const { cx, cy, r, kx } = vesselMetrics(R)
  let top = cy + r * 0.1
  for (const item of world.items) {
    const def = findCatalogDef(item.id)
    if (def?.category === 'fauna' && def.habitat === 'glass') continue
    const box = itemBox(R, item, view, world.items)
    if (box) top = Math.min(top, box.y - box.size * 0.5)
  }
  const bottom = cy + r * 0.92
  top = Math.max(cy - r, top - r * 0.06)
  const width = r * kx * 1.6
  const h = Math.max(40, bottom - top)
  const fit = g.w < 640 ? Math.min(2.4, g.h / h) : Math.min(g.w / width, g.h / h)
  Object.assign(
    view.camT,
    clampCam({ z: clamp(fit * 0.97, 1, 2.6), u: cx / g.w, v: (top + bottom) / 2 / g.h }),
  )
  view.follow = null
}

/** Starts (or retargets) a close-up on `uids` for `ms` from `now`; the view before the first one is saved. */
export function focusOn(view: ViewState, uids: string[], z: number, ms: number, now: number): void {
  if (uids.length === 0) return
  if (!view.follow) view.saved = { ...view.camT }
  view.follow = { uids: [...uids], z: Math.max(z, Math.min(view.camT.z, 3)), until: now + ms }
}

/** Ends a close-up and returns to the saved view. */
export function releaseFocus(view: ViewState): void {
  if (!view.follow) return
  view.follow = null
  Object.assign(view.camT, clampCam(view.saved ?? home()))
  view.saved = null
}

/** Per-frame ease at 60 fps, scaled to the real frame time. */
const ease = (perFrame: number, dtMs: number) => 1 - (1 - perFrame) ** (Math.max(0, dtMs) / 16.67)

/**
 * Once per frame, before drawing (prototype updateCamera): phone start, close-up follow, camera ease and
 * clamp, then the parallax. `timestamp` is the rAF clock; `pointerLive` means the pointer is over the
 * canvas and the relax overlay is not idling.
 */
export function updateCamera(
  view: ViewState,
  world: EngineWorld,
  state: StudioState,
  R: Rect,
  size: { w: number; h: number },
  dtMs: number,
  timestamp: number,
  pointerLive: boolean,
): void {
  view.size = { w: size.w, h: size.h }

  if (!view.framedOnce) {
    view.framedOnce = true
    if (size.w < 640 && world.items.length > 0) framePlants(view, world, R)
  }

  const f = view.follow
  if (f) {
    const its = timestamp > f.until ? [] : world.items.filter((i) => f.uids.includes(i.uid))
    let x = 0
    let y = 0
    let n = 0
    for (const item of its) {
      const box = itemBox(R, item, view, world.items)
      if (!box) continue
      x += box.x
      y += box.y - box.size * 0.05
      n++
    }
    if (n === 0) releaseFocus(view)
    else Object.assign(view.camT, clampCam({ z: f.z, u: x / n / size.w, v: y / n / size.h }))
  }

  const c = view.cam
  const t = view.camT
  const k = state.reducedMotion || view.gesture ? 1 : ease(0.1, dtMs)
  if (k >= 1) Object.assign(c, t)
  else {
    c.z += (t.z - c.z) * k
    c.u += (t.u - c.u) * k
    c.v += (t.v - c.v) * k
    if (Math.abs(t.z - c.z) < 0.002) c.z = t.z
  }
  clampCam(c)

  // Parallax: the pointer (or a slow drift in relax mode) plus where the camera is looking.
  let tx = 0
  let ty = 0
  const busy = world.draggingId !== null || world.isMisting || world.isPouring || view.gesture
  if (view.depthOn && !state.reducedMotion && !busy) {
    if (pointerLive && view.pointerScreen) {
      tx = view.pointerScreen.x
      ty = view.pointerScreen.y
    } else if (state.relaxMode) {
      tx = Math.sin(timestamp * 0.00028) * 0.7
      ty = Math.cos(timestamp * 0.0002) * 0.3
    }
  }
  if (view.depthOn) {
    tx += (c.u - 0.5) * 2.4
    ty += (c.v - 0.5) * 1.2
  }
  tx = clamp(tx, -1.6, 1.6)
  ty = clamp(ty, -1.6, 1.6)
  const pk = state.reducedMotion ? 1 : ease(0.07, dtMs)
  view.par.x += (tx - view.par.x) * pk
  view.par.y += (ty - view.par.y) * pk
}
