import type { CatalogId } from '@/data/catalog'

export type DrawFn = (ctx: CanvasRenderingContext2D) => void

export const FLORA_SPRITES: Partial<Record<CatalogId, DrawFn>> = {
  peacock_fern(ctx) {
    // Blue-green iridescent Selaginella fronds
    const fronds = [
      [-24, -18, -0.7],
      [-12, -28, -0.35],
      [4, -30, 0.1],
      [18, -22, 0.5],
      [-20, 4, -1.1],
      [20, 2, 0.9],
    ]
    fronds.forEach(([, , rot]) => {
      ctx.save()
      ctx.translate(0, 14)
      ctx.rotate(rot)
      ctx.strokeStyle = '#146c60'
      ctx.lineWidth = 1.8
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(0, -34)
      ctx.stroke()
      for (let y = -6; y >= -32; y -= 5) {
        ctx.fillStyle = y < -20 ? '#2dd4bf' : '#0d9488'
        ctx.beginPath()
        ctx.ellipse(-4.5, y, 4.5, 2.3, -0.4, 0, Math.PI * 2)
        ctx.ellipse(4.5, y, 4.5, 2.3, 0.4, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    })
  },

  cryptanthus_pink(ctx) {
    // Rose-pink Earth Star bromeliad rosette at top-right of cliff
    for (let i = 0; i < 10; i++) {
      ctx.save()
      ctx.rotate((i * Math.PI * 2) / 10)
      ctx.fillStyle = i % 2 === 0 ? '#e88ca5' : '#c96b84'
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.quadraticCurveTo(6, -14, 0, -26)
      ctx.quadraticCurveTo(-6, -14, 0, 0)
      ctx.fill()
      ctx.restore()
    }
    ctx.fillStyle = '#fce7f3'
    ctx.beginPath()
    ctx.arc(0, 0, 4, 0, Math.PI * 2)
    ctx.fill()
  },

  pogostemon_star(ctx) {
    // Dense starburst of bright lime-green linear leaves (lower-left of reference)
    for (let layer = 0; layer < 2; layer++) {
      const count = layer === 0 ? 18 : 12
      const len = layer === 0 ? 26 : 17
      for (let i = 0; i < count; i++) {
        const angle = -Math.PI + (i / (count - 1)) * Math.PI + layer * 0.1
        ctx.save()
        ctx.translate(0, 14)
        ctx.rotate(angle + Math.PI / 2)
        ctx.fillStyle = layer === 0 ? '#4d9c36' : '#84cc16'
        ctx.beginPath()
        ctx.ellipse(0, -len * 0.5, 2.6, len * 0.5, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
    }
  },

  subwassertang(ctx) {
    // Lush ribbon-like translucent underwater moss clump
    const lobes = [
      [-16, 8],
      [-8, 2],
      [0, 4],
      [10, 2],
      [18, 8],
      [-12, 14],
      [-2, 12],
      [8, 14],
      [14, 16],
    ]
    lobes.forEach(([lx, ly], idx) => {
      ctx.fillStyle = idx % 2 === 0 ? '#15803d' : '#22c55e'
      ctx.beginPath()
      ctx.arc(lx, ly, 8.5, 0, Math.PI * 2)
      ctx.fill()
    })
  },

  boston_fern(ctx) {
    const angles = [-0.85, -0.5, -0.2, 0.15, 0.48, 0.82]
    angles.forEach((a, idx) => {
      ctx.save()
      ctx.translate(0, 22)
      ctx.rotate(a)
      ctx.strokeStyle = '#2d6a3e'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.quadraticCurveTo(4, -22, 0, -44)
      ctx.stroke()
      for (let y = -6; y >= -42; y -= 5.5) {
        ctx.fillStyle = idx % 2 === 0 ? '#409156' : '#52b76a'
        ctx.beginPath()
        ctx.ellipse(-5, y, 4.5, 2, -0.2, 0, Math.PI * 2)
        ctx.ellipse(5, y, 4.5, 2, 0.2, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    })
  },

  fittonia(ctx) {
    const leaves = [
      [-14, 2, -0.45],
      [14, 2, 0.45],
      [-8, -12, -0.2],
      [8, -12, 0.2],
      [0, -20, 0],
    ]
    leaves.forEach(([lx, ly, rot]) => {
      ctx.save()
      ctx.translate(lx, ly + 12)
      ctx.rotate(rot)
      ctx.fillStyle = '#1e4631'
      ctx.beginPath()
      ctx.ellipse(0, 0, 10, 14, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#f472b6'
      ctx.lineWidth = 1.3
      ctx.beginPath()
      ctx.moveTo(0, 10)
      ctx.lineTo(0, -10)
      ;[-5, 0, 5].forEach((vy) => {
        ctx.moveTo(0, vy)
        ctx.lineTo(-6, vy - 3)
        ctx.moveTo(0, vy)
        ctx.lineTo(6, vy - 3)
      })
      ctx.stroke()
      ctx.restore()
    })
  },

  moss_mound(ctx) {
    const grad = ctx.createRadialGradient(-6, 2, 4, 0, 10, 28)
    grad.addColorStop(0, '#a3e635')
    grad.addColorStop(0.65, '#65a30d')
    grad.addColorStop(1, '#365314')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(0, 16, 24, Math.PI, 0)
    ctx.quadraticCurveTo(24, 22, 0, 22)
    ctx.quadraticCurveTo(-24, 22, -24, 16)
    ctx.fill()
  },

  anubias_nana(ctx) {
    const pts = [
      [-12, 6, -0.5],
      [-5, 0, -0.2],
      [4, -2, 0.15],
      [12, 5, 0.5],
      [0, 8, 0],
    ]
    pts.forEach(([x, y, r]) => {
      ctx.save()
      ctx.translate(x, y + 6)
      ctx.rotate(r)
      ctx.fillStyle = '#166534'
      ctx.beginPath()
      ctx.ellipse(0, -8, 6.5, 10, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    })
  },

  trailing_ivy(ctx) {
    ctx.strokeStyle = '#365314'
    ctx.lineWidth = 2
    ;[
      [-16, 30],
      [0, 36],
      [16, 28],
    ].forEach(([tx, ty]) => {
      ctx.beginPath()
      ctx.moveTo(0, -14)
      ctx.quadraticCurveTo(tx * 0.5, 8, tx, ty)
      ctx.stroke()
    })
    const pts = [
      [0, -14],
      [-8, -4],
      [8, -2],
      [-12, 10],
      [2, 12],
      [12, 10],
      [-15, 24],
      [0, 28],
      [15, 22],
    ]
    pts.forEach(([x, y], i) => {
      ctx.fillStyle = i % 2 === 0 ? '#4d7c0f' : '#65a30d'
      ctx.beginPath()
      ctx.arc(x, y, 5.5, 0, Math.PI * 2)
      ctx.fill()
    })
  },

  frogbit_pads(ctx) {
    const pads = [
      [-14, 6, 8],
      [0, 4, 10],
      [14, 7, 7.5],
      [-5, 11, 6.5],
      [8, 12, 6],
    ]
    ctx.strokeStyle = 'rgba(214, 211, 209, 0.65)'
    ctx.lineWidth = 1.2
    pads.forEach(([px, py]) => {
      ctx.beginPath()
      ctx.moveTo(px, py + 2)
      ctx.quadraticCurveTo(px - 2, py + 12, px + 1, py + 20)
      ctx.stroke()
    })
    pads.forEach(([px, py, pr], i) => {
      ctx.fillStyle = i % 2 === 0 ? '#4d7c0f' : '#84cc16'
      ctx.beginPath()
      ctx.ellipse(px, py, pr, pr * 0.55, 0, 0, Math.PI * 2)
      ctx.fill()
    })
  },

  echeveria(ctx) {
    for (let ring = 3; ring >= 1; ring--) {
      const count = ring * 5
      const rad = ring * 6.5
      for (let i = 0; i < count; i++) {
        const a = (i * Math.PI * 2) / count + ring * 0.3
        ctx.save()
        ctx.translate(0, 8)
        ctx.rotate(a)
        ctx.fillStyle = ring === 1 ? '#a7f3d0' : ring === 2 ? '#6ee7b7' : '#34d399'
        ctx.beginPath()
        ctx.ellipse(0, -rad * 0.6, 4.5, rad * 0.6, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
    }
  },

  barrel_cactus(ctx) {
    ctx.fillStyle = '#4d7c0f'
    ctx.beginPath()
    ctx.arc(0, 8, 18, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#fde047'
    ctx.lineWidth = 1.2
    ;[-10, -4, 4, 10].forEach((x) => {
      ctx.beginPath()
      ctx.moveTo(x, -8)
      ctx.quadraticCurveTo(x * 1.3, 8, x, 24)
      ctx.stroke()
    })
  },
}
