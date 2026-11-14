import type { LightingId, PlacedItem, Rect } from '@/data/types'
import type { StudioState } from '@/store/studio'
import { traceVesselPath } from '../geometry'
import { createScratchCanvas } from '../sprites/spriteCache'
import type { ViewState } from '../view'
import type { Point } from '../world'
import { vesselMetrics } from './metrics'

/** Depth plane: 0 = at the glass (soil face, loose plants, animals), 1 = rock and hardscape, 2 = the back wall. */
export type Plane = 0 | 1 | 2

/**
 * Which plane an item is drawn on (prototype planeOf 7748). A mounted item sits on its parent's plane, so a
 * fern on the moss wall moves with the wall; an orphan, or one whose parent is not in `items`, is on plane 1.
 */
export function planeOf(item: PlacedItem, items?: readonly PlacedItem[]): Plane {
  if (item.id === 'moss_wall_cliff') return 2
  if (item.parentUid) {
    const parent = items?.find((p) => p.uid === item.parentUid)
    return parent ? planeOf(parent) : 1
  }
  if (item.category === 'hardscape') return 1
  return 0
}

const ZERO_SHIFT: Readonly<Point> = Object.freeze({ x: 0, y: 0 })

/**
 * How far a plane slides with the parallax (prototype 7753): `par · r · k`, k = 0.013 (plane 1) or 0.034
 * (plane 2), the y shift scaled by 0.35. Zero with depth off and for plane 0.
 */
export function planeShiftFor(view: ViewState, plane: Plane, r: number): Readonly<Point> {
  if (!view.depthOn || !plane) return ZERO_SHIFT
  const k = plane === 2 ? 0.034 : 0.013
  return { x: view.par.x * r * k, y: view.par.y * r * k * 0.35 }
}

// A light wash of the air colour over things further back (prototype 7762).
const HAZE_COL: Record<LightingId, string> = {
  night: '#1c2538',
  twilight: '#5b4046',
  dawn: '#efe6d3',
  sunlight: '#e6ede9',
}
// One copy per sprite and `plane|lighting`, painted once and never again: safe to hand to gpuImage.
const hazeCache = new WeakMap<HTMLCanvasElement, Map<string, HTMLCanvasElement>>()

/**
 * The sprite washed with the air colour for its plane. Returns `src` for plane 0, with depth off, or when
 * no context can be had (tests, a lost context; nothing is cached then, so the next call tries again).
 */
export function hazedSprite(
  src: HTMLCanvasElement,
  plane: Plane,
  lighting: LightingId,
  depthOn: boolean,
): HTMLCanvasElement {
  if (!depthOn || !plane) return src
  const key = `${plane}|${lighting}`
  let m = hazeCache.get(src)
  const cached = m?.get(key)
  if (cached) return cached
  const c = createScratchCanvas(src.width, src.height)
  const g = c.getContext('2d')
  if (!g) return src
  g.drawImage(src, 0, 0)
  g.globalCompositeOperation = 'source-atop'
  g.globalAlpha = plane === 2 ? 0.2 : 0.07
  g.fillStyle = HAZE_COL[lighting] ?? HAZE_COL.sunlight
  g.fillRect(0, 0, c.width, c.height)
  if (!m) {
    m = new Map()
    hazeCache.set(src, m)
  }
  m.set(key, c)
  return c
}

/**
 * The pane itself: one faint reflection band, a lit inner edge and a thin dark line, clipped to the vessel
 * (prototype drawGlassDepth 7946). Nothing with depth off.
 */
export function drawGlassDepth(
  ctx: CanvasRenderingContext2D,
  state: StudioState,
  R: Rect,
  depthOn: boolean,
): void {
  if (!depthOn) return
  const { cx, cy, r, kx } = vesselMetrics(R)
  const night = state.lighting === 'night'
  ctx.save()
  traceVesselPath(ctx, state.vessel, R)
  ctx.clip()
  ctx.fillStyle = `rgba(255, 255, 255, ${night ? 0.025 : 0.05})`
  ctx.beginPath()
  ctx.moveTo(cx - r * 0.42 * kx, cy - r)
  ctx.lineTo(cx - r * 0.3 * kx, cy - r)
  ctx.lineTo(cx - r * 0.3 * kx - r * 0.55, cy + r)
  ctx.lineTo(cx - r * 0.42 * kx - r * 0.55, cy + r)
  ctx.closePath()
  ctx.fill()
  traceVesselPath(ctx, state.vessel, R)
  ctx.lineWidth = r * 0.045
  ctx.strokeStyle = `rgba(255, 255, 255, ${night ? 0.05 : 0.13})`
  ctx.stroke()
  traceVesselPath(ctx, state.vessel, R)
  ctx.lineWidth = r * 0.014
  ctx.strokeStyle = 'rgba(16, 32, 24, 0.16)'
  ctx.stroke()
  ctx.restore()
}
