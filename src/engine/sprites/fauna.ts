import type { CatalogId } from '@/data/catalog'

export type DrawFn = (ctx: CanvasRenderingContext2D) => void

export const FAUNA_SPRITES: Partial<Record<CatalogId, DrawFn>> = {
  tree_frog(ctx) {
    ctx.fillStyle = '#22c55e'
    ctx.beginPath()
    ctx.ellipse(0, 6, 10, 7, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ef4444'
    ctx.beginPath()
    ctx.arc(-5, 1, 3, 0, Math.PI * 2)
    ctx.arc(5, 1, 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#111827'
    ctx.beginPath()
    ctx.arc(-5, 1, 1.2, 0, Math.PI * 2)
    ctx.arc(5, 1, 1.2, 0, Math.PI * 2)
    ctx.fill()
  },

  vampire_crab(ctx) {
    ctx.fillStyle = '#6b21a8'
    ctx.beginPath()
    ctx.ellipse(0, 6, 9, 6, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#facc15'
    ctx.beginPath()
    ctx.arc(-3.5, 3, 1.5, 0, Math.PI * 2)
    ctx.arc(3.5, 3, 1.5, 0, Math.PI * 2)
    ctx.fill()
  },

  medaka_fish(ctx) {
    ctx.fillStyle = '#fb923c'
    ctx.beginPath()
    ctx.ellipse(0, 4, 10, 4, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(-9, 4)
    ctx.lineTo(-15, -1)
    ctx.lineTo(-15, 9)
    ctx.closePath()
    ctx.fill()
  },

  cherry_shrimp(ctx) {
    ctx.strokeStyle = '#ef4444'
    ctx.lineWidth = 4
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.arc(0, 6, 7, Math.PI * 1.1, Math.PI * 1.9)
    ctx.stroke()
  },

  isopod(ctx) {
    ctx.fillStyle = '#f5f5f4'
    ctx.beginPath()
    ctx.ellipse(0, 6, 9, 5, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#292524'
    ;[
      [-4, 5],
      [1, 4],
      [5, 6],
    ].forEach(([x, y]) => {
      ctx.beginPath()
      ctx.arc(x, y, 2, 0, Math.PI * 2)
      ctx.fill()
    })
  },

  ducky_isopod(ctx) {
    ctx.fillStyle = '#57534e'
    ctx.beginPath()
    ctx.ellipse(-2, 6, 8, 5, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#facc15'
    ctx.beginPath()
    ctx.ellipse(5, 6, 5, 4.5, 0, 0, Math.PI * 2)
    ctx.fill()
  },

  springtails(ctx) {
    ctx.fillStyle = '#ffffff'
    ;[
      [-6, 6],
      [0, 8],
      [6, 5],
    ].forEach(([x, y]) => {
      ctx.beginPath()
      ctx.ellipse(x, y, 2.5, 1.2, 0.2, 0, Math.PI * 2)
      ctx.fill()
    })
  },

  garden_snail(ctx) {
    ctx.fillStyle = '#d6d3d1'
    ctx.beginPath()
    ctx.ellipse(2, 9, 10, 3, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#d97706'
    ctx.beginPath()
    ctx.arc(-2, 4, 6.5, 0, Math.PI * 2)
    ctx.fill()
  },
}
