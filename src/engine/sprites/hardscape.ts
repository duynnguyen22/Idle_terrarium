import type { CatalogId } from '@/data/catalog'

export type DrawFn = (ctx: CanvasRenderingContext2D) => void

export const HARDSCAPE_SPRITES: Partial<Record<CatalogId, DrawFn>> = {
  moss_wall_cliff(ctx) {
    // Rich multi-tiered organic rainforest moss wall backdrop
    const bgGrad = ctx.createLinearGradient(0, -54, 0, 50)
    bgGrad.addColorStop(0, '#254d2b')
    bgGrad.addColorStop(0.5, '#356938')
    bgGrad.addColorStop(1, '#1e3d23')
    ctx.fillStyle = bgGrad
    ctx.beginPath()
    ctx.roundRect(-48, -50, 96, 96, 18)
    ctx.fill()

    // Pillow moss mounds
    const mounds: [number, number, number, string][] = [
      [-26, -34, 24, '#4d8c45'],
      [10, -36, 26, '#3f7839'],
      [30, -24, 20, '#589c4e'],
      [-32, -8, 22, '#3b7035'],
      [0, -10, 28, '#4a8742'],
      [28, 4, 22, '#5ca352'],
      [-24, 20, 24, '#478240'],
      [12, 22, 25, '#3b6e35'],
    ]
    mounds.forEach(([mx, my, mr, col]) => {
      ctx.fillStyle = col
      ctx.beginPath()
      ctx.arc(mx, my, mr, 0, Math.PI * 2)
      ctx.fill()
    })

    // Velvety highlight speckles
    ctx.fillStyle = '#84cc16'
    for (let i = 0; i < 45; i++) {
      const sx = -40 + ((i * 19) % 80)
      const sy = -42 + ((i * 23) % 78)
      ctx.globalAlpha = 0.35
      ctx.beginPath()
      ctx.arc(sx, sy, 2.2, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  },

  root_slate_waterfall(ctx) {
    // Dark diagonal slate cliff & tangled driftwood roots from reference image
    ctx.fillStyle = '#273036'
    ctx.beginPath()
    ctx.moveTo(14, -52)
    ctx.lineTo(42, -46)
    ctx.lineTo(30, 42)
    ctx.lineTo(-28, 46)
    ctx.lineTo(-34, 12)
    ctx.lineTo(-10, -32)
    ctx.closePath()
    ctx.fill()

    // Slate rock facets
    ctx.fillStyle = '#38444c'
    ctx.beginPath()
    ctx.moveTo(10, -46)
    ctx.lineTo(32, -38)
    ctx.lineTo(18, 28)
    ctx.lineTo(-14, 32)
    ctx.closePath()
    ctx.fill()

    // Moss cushions flanking the chute
    ctx.fillStyle = '#4d8b3e'
    ;[
      [-16, -16, 13],
      [24, -12, 14],
      [-22, 16, 15],
      [22, 18, 14],
    ].forEach(([x, y, r]) => {
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    })

    // Gnawed paler driftwood roots arching across the waterfall
    ctx.strokeStyle = '#9c8c79'
    ctx.lineWidth = 4.5
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(18, -42)
    ctx.quadraticCurveTo(-8, -14, -18, 22)
    ctx.moveTo(2, -22)
    ctx.quadraticCurveTo(6, 4, -4, 28)
    ctx.moveTo(-4, -10)
    ctx.quadraticCurveTo(-20, 4, -28, 16)
    ctx.stroke()
  },

  golden_river_boulders(ctx) {
    // Warm yellow-ochre river boulders & gravel bank on right side of reference photo
    const rocks = [
      { x: 16, y: -14, rx: 16, ry: 12, col: '#c78d3a' },
      { x: -12, y: 2, rx: 18, ry: 13, col: '#b87b2a' },
      { x: 14, y: 8, rx: 19, ry: 14, col: '#d99b43' },
      { x: -4, y: 18, rx: 15, ry: 10, col: '#e0a956' },
      { x: 22, y: 22, rx: 13, ry: 9, col: '#c4832d' },
    ]
    rocks.forEach((rk) => {
      ctx.fillStyle = rk.col
      ctx.beginPath()
      ctx.ellipse(rk.x, rk.y, rk.rx, rk.ry, -0.15, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(74, 46, 12, 0.35)'
      ctx.lineWidth = 1.5
      ctx.stroke()
    })
    // Moss tucked between golden stones
    ctx.fillStyle = '#4d8c3c'
    ;[
      [-2, -4, 7],
      [6, 16, 6],
      [-18, 12, 6],
    ].forEach(([mx, my, mr]) => {
      ctx.beginPath()
      ctx.arc(mx, my, mr, 0, Math.PI * 2)
      ctx.fill()
    })
  },

  dragon_peak(ctx) {
    ctx.fillStyle = '#57534e'
    ctx.beginPath()
    ctx.moveTo(-4, -46)
    ctx.lineTo(14, -30)
    ctx.lineTo(24, 8)
    ctx.lineTo(18, 34)
    ctx.lineTo(-22, 34)
    ctx.lineTo(-26, -6)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#292524'
    ;[
      [-6, -16, 5, 10],
      [8, 2, 6, 12],
      [-10, 14, 5, 9],
    ].forEach(([x, y, rx, ry]) => {
      ctx.beginPath()
      ctx.ellipse(x, y, rx, ry, 0.2, 0, Math.PI * 2)
      ctx.fill()
    })
  },

  cliff_waterfall(ctx) {
    ctx.fillStyle = '#475569'
    ctx.beginPath()
    ctx.moveTo(-26, -42)
    ctx.lineTo(26, -40)
    ctx.lineTo(36, 32)
    ctx.lineTo(-36, 32)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#38bdf8'
    ctx.fillRect(-7, -38, 14, 68)
  },

  bonsai_driftwood(ctx) {
    ctx.strokeStyle = '#78350f'
    ctx.lineWidth = 7
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(-4, 32)
    ctx.quadraticCurveTo(-10, 4, 0, -14)
    ctx.moveTo(0, -14)
    ctx.lineTo(-24, -28)
    ctx.moveTo(0, -14)
    ctx.lineTo(24, -24)
    ctx.moveTo(-6, -2)
    ctx.lineTo(16, -12)
    ctx.stroke()
  },

  quartz(ctx) {
    const spires = [
      [-10, 6, -0.25, 18],
      [10, 8, 0.28, 16],
      [0, 2, 0, 26],
    ]
    spires.forEach(([x, y, r, h]) => {
      ctx.save()
      ctx.translate(x, y + 10)
      ctx.rotate(r)
      ctx.fillStyle = '#f472b6'
      ctx.beginPath()
      ctx.moveTo(-6, 0)
      ctx.lineTo(-4, -h)
      ctx.lineTo(0, -h - 7)
      ctx.lineTo(4, -h)
      ctx.lineTo(6, 0)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    })
  },

  amethyst_geode(ctx) {
    ctx.fillStyle = '#475569'
    ctx.beginPath()
    ctx.ellipse(0, 4, 18, 22, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#9333ea'
    ctx.beginPath()
    ctx.ellipse(0, 5, 13, 16, 0, 0, Math.PI * 2)
    ctx.fill()
  },

  lantern(ctx) {
    ctx.fillStyle = '#64748b'
    ctx.fillRect(-10, 16, 20, 5)
    ctx.fillRect(-4, 4, 8, 12)
    ctx.fillStyle = '#fef08a'
    ctx.fillRect(-6, -8, 12, 12)
    ctx.fillStyle = '#475569'
    ctx.beginPath()
    ctx.moveTo(-16, -8)
    ctx.lineTo(0, -19)
    ctx.lineTo(16, -8)
    ctx.closePath()
    ctx.fill()
  },

  river_stones(ctx) {
    ctx.fillStyle = '#64748b'
    ctx.beginPath()
    ctx.ellipse(-8, 12, 14, 9, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#94a3b8'
    ctx.beginPath()
    ctx.ellipse(8, 14, 12, 8, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#475569'
    ctx.beginPath()
    ctx.ellipse(0, 4, 10, 6.5, 0, 0, Math.PI * 2)
    ctx.fill()
  },
}
