import type { CatalogDef } from '@/data/types'
import type { StudioState } from '@/store/studio'

/** Night glow for lit hardscape and decor, centred by `glowAt` and sized by `glowR`. */
export function drawNightGlow(
  ctx: CanvasRenderingContext2D,
  state: Pick<StudioState, 'lighting'>,
  def: CatalogDef,
  drawSize: number,
): void {
  if (!('glowsAtNight' in def) || !def.glowsAtNight) return
  if (state.lighting !== 'night' && state.lighting !== 'twilight') return
  const gx = def.glowAt ? (def.glowAt[0] * drawSize) / 128 : 0
  const gy = def.glowAt ? (def.glowAt[1] * drawSize) / 128 : 0
  const gr = drawSize * (def.glowR ?? 0.65) * (state.lighting === 'night' ? 1 : 0.8)
  const g = ctx.createRadialGradient(gx, gy, 2, gx, gy, gr)
  g.addColorStop(0, def.glowColor ?? 'rgba(0,0,0,0)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(gx, gy, gr, 0, Math.PI * 2)
  ctx.fill()
}
