import type { CatalogDef, PlacedItem, Rect } from '@/data/types'
import type { StudioState } from '@/store/studio'
import {
  getDividerNormX,
  getPoolBedNormY,
  getSoilSurfaceNormalizedY,
  hasPool,
  isInPool,
} from '../geometry'
import { isLampOn } from '../simulation/clock'
import { gpuImage } from '../sprites/gpuImage'
import { createScratchCanvas } from '../sprites/spriteCache'
import type { EngineWorld } from '../world'
import { normToPx, vesselMetrics } from './metrics'
import { terrainOf } from './terrain'

// One soft shadow, drawn once and reused under everything (prototype 7782).
// Only a painted sprite is kept: a context-less test canvas comes back blank each time.
let painted: HTMLCanvasElement | null = null

export function shadowSprite(): HTMLCanvasElement {
  if (painted) return painted
  const c = createScratchCanvas(128, 32)
  const g = c.getContext('2d')
  if (!g) return c
  g.translate(64, 16)
  g.scale(1, 0.25)
  const gr = g.createRadialGradient(0, 0, 4, 0, 0, 62)
  gr.addColorStop(0, 'rgba(8, 14, 10, 0.6)')
  gr.addColorStop(0.55, 'rgba(8, 14, 10, 0.26)')
  gr.addColorStop(1, 'rgba(8, 14, 10, 0)')
  g.fillStyle = gr
  g.beginPath()
  g.arc(0, 0, 62, 0, Math.PI * 2)
  g.fill()
  return (painted = c)
}

// One lamp overhead. A shadow only ever lands on a surface: the soil, the pool bed,
// or the rock or wall a plant is mounted on. Nothing is drawn in the air.
export function lightK(state: Pick<StudioState, 'lighting' | 'hasGrowLamp'>): number {
  return state.lighting === 'night' ? 0.4 : isLampOn(state) ? 1 : 0.65
}

/**
 * The shadow an unmounted item casts on the soil or the pool bed (prototype 7802). Call with the context
 * translated to the item centre and before the item's rotation, flip and sway. `shiftY` is the item's
 * depth-plane y shift, so the ground line moves with it.
 */
export function drawGroundShadow(
  ctx: CanvasRenderingContext2D,
  world: EngineWorld,
  state: StudioState,
  R: Rect,
  item: PlacedItem,
  def: CatalogDef,
  box: { x: number; y: number; size: number },
  shiftY: number,
): void {
  if (def.category === 'fauna' && def.habitat === 'glass') return
  const { x: px, y: py, size: drawSize } = box
  const { cx, cy, r, kx } = vesselMetrics(R)
  const terrain = terrainOf(world, state)
  const soilAt = (x: number) => getSoilSurfaceNormalizedY(terrain, x)
  const s = gpuImage(shadowSprite(), world.view.fastDraw)
  const a0 = ctx.globalAlpha
  const k = lightK(state)
  // Things to the right of the lamp throw their shadow further right, and the reverse
  const lean = isLampOn(state) ? Math.max(-1, Math.min(1, (px - cx) / (r * kx))) : 0
  const pool = hasPool(state.waterSplit)
  const inPool = isInPool(item.x, state.waterSplit)

  if (def.category === 'flora' && def.floatsOnWater && inPool) {
    // Floating leaves shade the water just beneath them
    ctx.save()
    ctx.beginPath()
    ctx.rect(-drawSize, drawSize * 0.03, drawSize * 2, drawSize * 0.3)
    ctx.clip()
    ctx.globalAlpha = a0 * 0.4 * k
    ctx.drawImage(
      s,
      -drawSize * 0.3 + lean * drawSize * 0.04,
      drawSize * 0.03 - drawSize * 0.08,
      drawSize * 0.6,
      drawSize * 0.16,
    )
    ctx.restore()
    ctx.globalAlpha = a0
    return
  }

  const groundY =
    cy - r + (inPool ? getPoolBedNormY(state.substrates) : soilAt(item.x)) * 2 * r + shiftY
  const dy = groundY - py
  // How far the thing is above the surface: a held plant or a swimming shrimp casts a wider, fainter shadow
  const lift = Math.max(0, Math.min(1, (dy - drawSize * 0.24) / (r * 0.4)))
  const alpha = a0 * k * (inPool ? 0.55 : 1) * (1 - lift * 0.85)
  if (alpha < 0.03) return
  let ang = 0
  if (!inPool) {
    const e = 0.012
    ang = Math.atan2((soilAt(item.x + e) - soilAt(item.x - e)) * 2 * r, 2 * e * 2 * r * kx)
  }
  const wide = (item.category === 'hardscape' ? 0.8 : 0.72) * drawSize * (1 + lift * 0.7)
  const tall = drawSize * 0.2 * (1 + lift * 0.4)
  ctx.save()
  if (pool) {
    // A shadow on the soil stops at the bank, and one on the pool bed stays in the pool
    const bank = normToPx(R, getDividerNormX(state.waterSplit)) - px
    ctx.beginPath()
    if (inPool) ctx.rect(bank - r * 4, -r * 2, r * 4, r * 4)
    else ctx.rect(bank, -r * 2, r * 4, r * 4)
    ctx.clip()
  }
  ctx.translate(lean * drawSize * 0.14 * (1 + lift * 2), dy)
  ctx.rotate(ang)
  // Keep only the half that lies on the ground
  ctx.beginPath()
  ctx.rect(-wide, -0.5, wide * 2, tall)
  ctx.clip()
  ctx.globalAlpha = alpha * 0.8
  ctx.drawImage(s, -wide / 2, -tall / 2, wide, tall)
  if (lift < 0.25) {
    // Darkest right where it touches
    ctx.globalAlpha = alpha * (1 - lift * 3)
    ctx.drawImage(s, -wide * 0.27, -tall * 0.28, wide * 0.54, tall * 0.56)
  }
  ctx.restore()
  ctx.globalAlpha = a0
}
