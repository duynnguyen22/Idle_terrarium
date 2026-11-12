import type { Rect } from '@/data/types'
import type { StudioState } from '@/store/studio'
import { vesselMetrics } from './metrics'

/** Dynamic sky backdrop plus the wooden studio base board. Needs the full canvas size for the sky. */
export function drawBackground(
  ctx: CanvasRenderingContext2D,
  state: StudioState,
  R: Rect,
  view: { w: number; h: number },
): void {
  const { cx, cy, r, kx } = vesselMetrics(R)
  const { w: W, h: H } = view

  const bgGrad = ctx.createLinearGradient(0, 0, 0, H)
  if (state.lighting === 'night') {
    bgGrad.addColorStop(0, '#0f172a')
    bgGrad.addColorStop(1, '#1e293b')
  } else if (state.lighting === 'twilight') {
    bgGrad.addColorStop(0, '#312e81')
    bgGrad.addColorStop(0.6, '#7c2d12')
    bgGrad.addColorStop(1, '#451a03')
  } else if (state.lighting === 'dawn') {
    bgGrad.addColorStop(0, '#dbeafe')
    bgGrad.addColorStop(0.55, '#fef3c7')
    bgGrad.addColorStop(1, '#e7e0d0')
  } else {
    bgGrad.addColorStop(0, '#eef2ec')
    bgGrad.addColorStop(1, '#d6dbd2')
  }
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, W, H)

  // Wooden studio base board
  ctx.fillStyle = '#cbbba0'
  ctx.beginPath()
  ctx.roundRect(cx - r * 0.78 * kx, cy + r * 0.84, r * 1.56 * kx, r * 0.06, 6)
  ctx.fill()
}
