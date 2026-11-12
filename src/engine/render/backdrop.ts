import type { Rect } from '@/data/types'
import { getCustomBackdropRevision } from '@/lib/backdropPhoto'
import type { StudioState } from '@/store/studio'
import { paintBackdrop } from './backdropPainters'
import { vesselMetrics } from './metrics'

export { paintBackdrop, ridgeY, seededRandom, skyGradient } from './backdropPainters'

/** Room light phases that tint the painted scene so it matches the room. */
const PHASE_TINT: Partial<Record<StudioState['lighting'], string>> = {
  night: 'rgba(8, 14, 34, 0.62)',
  twilight: 'rgba(96, 44, 70, 0.30)',
  dawn: 'rgba(255, 196, 150, 0.14)',
}

/** The painted scene is redrawn only when its key (backdrop, size, DPR, photo revision) changes. */
const cache: { key: string; canvas: HTMLCanvasElement | null } = { key: '', canvas: null }

/** Forgets the painted scene (tests, or after the custom photo changes outside the key). */
export function resetBackdropCache(): void {
  cache.key = ''
  cache.canvas = null
}

/**
 * Painted miniature landscape on the back glass (prototype-v7 drawMiniatureBackdrop), then a depth
 * haze wash and the room's light-phase tint over it. Must be called inside the vessel clip.
 * `custom` is the uploaded photo, required for the `custom` backdrop.
 */
export function drawMiniatureBackdrop(
  ctx: CanvasRenderingContext2D,
  state: StudioState,
  R: Rect,
  custom: HTMLImageElement | null,
): void {
  const { backdrop } = state
  if (!backdrop || backdrop === 'none') return
  if (backdrop === 'custom' && !custom) return
  const { cx, cy, r } = vesselMetrics(R)
  const w = Math.round(R.w)
  const h = Math.round(r * 1.72)
  const x0 = cx - w / 2
  const y0 = cy - r * 0.86
  const dpr = Math.min(globalThis.devicePixelRatio || 1, 2)
  const key = `${backdrop}|${w}|${h}|${dpr}|${custom ? getCustomBackdropRevision() : 0}`
  if (cache.key !== key || !cache.canvas) {
    const off = cache.canvas ?? document.createElement('canvas')
    off.width = Math.max(1, Math.round(w * dpr))
    off.height = Math.max(1, Math.round(h * dpr))
    const g = off.getContext('2d')
    if (!g) return
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    paintBackdrop(g, backdrop, w, h, custom)
    cache.canvas = off
    cache.key = key
  }
  ctx.drawImage(cache.canvas, x0, y0, w, h)

  // Depth haze: the backdrop reads as far away behind the plants
  const haze = (state.backdropHaze ?? 35) / 100
  if (haze > 0) {
    ctx.fillStyle =
      state.lighting === 'night'
        ? `rgba(15, 23, 42, ${(haze * 0.55).toFixed(3)})`
        : `rgba(236, 241, 236, ${(haze * 0.6).toFixed(3)})`
    ctx.fillRect(x0, y0, w, h)
  }
  // Match the room's light phase
  const tint = PHASE_TINT[state.lighting]
  if (tint) {
    ctx.fillStyle = tint
    ctx.fillRect(x0, y0, w, h)
  }
}
