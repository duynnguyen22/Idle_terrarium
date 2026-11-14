import { findCatalogDef, type CatalogId } from '@/data/catalog'
import type { PlacedItem, Rect } from '@/data/types'
import { babyScale } from '../simulation/breed'
import { sproutScale } from '../simulation/dayTick'
import { gpuImage } from '../sprites/gpuImage'
import { getSprite } from '../sprites/spriteCache'
import type { ViewState } from '../view'
import { normToPx, vesselMetrics, type RenderFn } from './metrics'

/**
 * Pixel box of a placed item: centre and drawn size, with the sprout / baby scale applied.
 * Shared by the specimen pass, the mark rings and the camera so all agree on the item's extent.
 * `view` is accepted for the depth-plane shift; without it the box is the unshifted one.
 */
export function itemBox(
  R: Rect,
  item: PlacedItem,
  view?: ViewState,
): { x: number; y: number; size: number } | null {
  void view
  const def = findCatalogDef(item.id)
  if (!def) return null
  const { cy, r: Rad } = vesselMetrics(R)
  // Seedlings grow from 0.58 of their species size; young fauna from 0.55 of the adult's.
  let scale = item.scale || 1
  if (item.baby !== undefined) scale = babyScale(item, scale)
  else if (item.category === 'flora' && item.stage === 'sprout')
    scale = sproutScale(item, def.baseScale)
  return {
    x: normToPx(R, item.x),
    y: cy - Rad + item.y * (Rad * 2),
    size: Rad * 0.36 * scale,
  }
}

/**
 * Placed flora, hardscape and fauna (prototype renderPlacedSpecimens): sprite blit with scale, rotation, flip
 * and sway, night glow, growth-stage overlays, animated waterfall, selection halo and snap-target nodes.
 * Mounted children are NOT re-positioned here (the prototype mutated items while drawing); the tick does that.
 */
export const drawSpecimens: RenderFn = (ctx, world, state, R, timestamp) => {
  const sorted = [...world.items].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))

  sorted.forEach((item) => {
    const def = findCatalogDef(item.id)
    if (!def) return
    // The millipede curls into a coil while it hides by day.
    const sprite =
      item.id === 'bumblebee_millipede' && item.aiState === 'hiding'
        ? getSprite('bumblebee_millipede_curl')
        : getSprite(item.id as CatalogId)

    const box = itemBox(R, item)
    if (!box) return
    const { x: px, y: py, size: drawSize } = box

    ctx.save()
    ctx.translate(px, py)

    // Subtle gentle sway for flora
    let sway = 0
    if (item.category === 'flora' && !state.reducedMotion) {
      sway = Math.sin(timestamp * 0.0009 + px * 0.02) * 0.025
    }
    ctx.rotate(((item.rotation || 0) * Math.PI) / 180 + sway)
    if (item.flipX) ctx.scale(-1, 1)
    // Glass climbers hang head-up on the pane; by day they tuck away, half seen.
    const climbing = def.category === 'fauna' && def.habitat === 'glass'
    if (climbing) {
      const wobble = state.reducedMotion ? 0 : Math.sin(timestamp * 0.002 + item.x * 30) * 0.05
      ctx.rotate(-Math.PI / 2 + wobble)
      if (item.aiState === 'hiding') ctx.globalAlpha = 0.5
    }

    // Ground contact shadow
    if (!climbing) {
      ctx.fillStyle = 'rgba(15, 23, 18, 0.18)'
      ctx.beginPath()
      ctx.ellipse(0, drawSize * 0.24, drawSize * 0.28, drawSize * 0.07, 0, 0, Math.PI * 2)
      ctx.fill()
    }

    // Night bioluminescence glow for crystals & lanterns
    if (
      def.category === 'hardscape' &&
      def.glowsAtNight &&
      (state.lighting === 'night' || state.lighting === 'twilight')
    ) {
      const g = ctx.createRadialGradient(0, 0, 4, 0, 0, drawSize * 0.65)
      g.addColorStop(0, def.glowColor ?? 'rgba(0,0,0,0)')
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(0, 0, drawSize * 0.65, 0, Math.PI * 2)
      ctx.fill()
    }

    // Crisp 256x256 vector sprite
    ctx.drawImage(
      gpuImage(sprite, world.view.fastDraw),
      -drawSize * 0.5,
      -drawSize * 0.5,
      drawSize,
      drawSize,
    )

    // Visual stage overlays for sprout & lush flora
    if (item.category === 'flora') {
      if (item.stage === 'sprout') {
        // Tender lime-green cotyledon starter leaves at base
        ctx.save()
        ctx.fillStyle = '#84cc16'
        ctx.beginPath()
        ctx.ellipse(
          -drawSize * 0.14,
          drawSize * 0.18,
          drawSize * 0.1,
          drawSize * 0.05,
          -0.4,
          0,
          Math.PI * 2,
        )
        ctx.ellipse(
          drawSize * 0.14,
          drawSize * 0.18,
          drawSize * 0.1,
          drawSize * 0.05,
          0.4,
          0,
          Math.PI * 2,
        )
        ctx.fill()
        ctx.restore()
      } else if (item.stage === 'lush') {
        // Delicate botanical blossoms on lush specimens
        ctx.save()
        ctx.fillStyle = '#fef08a'
        ;[
          [-0.12, -0.18],
          [0.14, -0.14],
          [0, -0.24],
        ].forEach(([bx, by]) => {
          ctx.beginPath()
          ctx.arc(bx * drawSize, by * drawSize, Math.max(2.2, drawSize * 0.035), 0, Math.PI * 2)
          ctx.fill()
        })
        ctx.restore()
      }
    }

    // Live animated waterfall cascade & ultrasonic mist for waterfall hardscapes
    if (item.isWaterfall || item.id === 'root_slate_waterfall' || item.id === 'cliff_waterfall') {
      ctx.save()
      // The pump drives the cascade: no streams when off, more and faster on strong flow.
      const flowCount = state.pumpFlow === 'strong' ? 13 : state.pumpFlow === 'off' ? 0 : 7
      const flowSpeed = state.pumpFlow === 'strong' ? 0.0028 : 0.0014
      for (let s = 0; s < flowCount; s++) {
        const prog = (timestamp * flowSpeed + s * (1 / Math.max(1, flowCount))) % 1
        const sx =
          -drawSize * 0.06 + Math.sin(s * 2.1) * (drawSize * 0.04) - prog * (drawSize * 0.08)
        const sy = -drawSize * 0.3 + prog * (drawSize * 0.62)
        ctx.strokeStyle = `rgba(224, 242, 254, ${(1 - prog * 0.5) * 0.78})`
        ctx.lineWidth = state.pumpFlow === 'strong' ? 3.2 : 2.2
        ctx.beginPath()
        ctx.moveTo(sx, sy)
        ctx.lineTo(sx - 2, sy + drawSize * 0.09)
        ctx.stroke()
      }

      // Plunge pool foam & ultrasonic fog cloud at base of waterfall
      if (state.hasFogger) {
        for (let f = 0; f < 4; f++) {
          const fPhase = timestamp * 0.001 + f * 1.5
          const fx = -drawSize * 0.08 + Math.sin(fPhase) * (drawSize * 0.14)
          const fy = drawSize * 0.24 + Math.cos(fPhase * 0.8) * (drawSize * 0.04)
          const fg = ctx.createRadialGradient(fx, fy, 2, fx, fy, drawSize * 0.28)
          fg.addColorStop(0, 'rgba(240, 249, 255, 0.52)')
          fg.addColorStop(1, 'rgba(240, 249, 255, 0)')
          ctx.fillStyle = fg
          ctx.beginPath()
          ctx.arc(fx, fy, drawSize * 0.28, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      ctx.restore()
    }

    ctx.restore()

    // Selection halo
    if (state.selectedId === item.uid && !state.relaxMode) {
      ctx.save()
      ctx.strokeStyle = '#15803d'
      ctx.lineWidth = 1.6
      ctx.setLineDash([5, 4])
      ctx.beginPath()
      ctx.arc(px, py, drawSize * 0.42, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }

    // Magnetic ledge nodes when dragging a mountable plant or fauna
    if (world.draggingId && def.category === 'hardscape' && def.mountPoints) {
      const draggedItem = world.items.find((i) => i.uid === world.draggingId)
      const draggedDef = draggedItem ? findCatalogDef(draggedItem.id) : null
      if (
        draggedItem &&
        draggedDef &&
        ((draggedDef.category === 'flora' && draggedDef.canMountOnRock) ||
          draggedItem.category === 'fauna')
      ) {
        def.mountPoints.forEach((mp) => {
          const nx = px + mp.ox * drawSize
          const ny = py + mp.oy * drawSize
          ctx.save()
          ctx.fillStyle = 'rgba(74, 222, 128, 0.45)'
          ctx.strokeStyle = '#16a34a'
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.arc(nx, ny, 7, 0, Math.PI * 2)
          ctx.fill()
          ctx.stroke()
          ctx.restore()
        })
      }
    }
  })
}
