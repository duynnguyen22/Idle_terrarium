import { fillShape, strokeShape, type Ctx } from '../fauna'

// Nerite snail: olive-gold half-dome with black zigzag stripes
export function drawFaunaNerite(ctx: Ctx): void {
  fillShape(ctx, '#8f8a7e', () => {
    ctx.moveTo(-15, 14)
    ctx.quadraticCurveTo(-12, 10, 0, 10)
    ctx.lineTo(13, 10.5)
    ctx.quadraticCurveTo(19, 11, 18, 14)
    ctx.closePath()
  })
  strokeShape(ctx, '#8f8a7e', 1.1, () => {
    ctx.moveTo(14, 11)
    ctx.quadraticCurveTo(19, 8, 23, 9)
    ctx.moveTo(14.5, 12)
    ctx.quadraticCurveTo(20, 11.5, 23.5, 13)
  })
  fillShape(ctx, '#1b1b18', () => ctx.arc(15, 10.6, 0.7, 0, Math.PI * 2))
  const shell = () => {
    ctx.moveTo(-15, 11)
    ctx.bezierCurveTo(-16, -6, 13, -8, 15, 10.5)
    ctx.quadraticCurveTo(0, 13, -15, 11)
  }
  fillShape(ctx, '#b8962e', shell)
  ctx.save()
  ctx.beginPath()
  shell()
  ctx.clip()
  for (let i = -4; i < 6; i++) {
    strokeShape(ctx, '#20190c', 1.7, () => {
      const x0 = i * 4.2 - 2
      ctx.moveTo(x0, -8)
      for (let k = 1; k <= 6; k++) ctx.lineTo(x0 + (k % 2 ? 2.4 : -0.6) + k * 0.9, -8 + k * 3.6)
    })
  }
  fillShape(ctx, 'rgba(70, 52, 14, 0.35)', () => ctx.ellipse(0, 12, 18, 4, 0, 0, Math.PI * 2))
  fillShape(ctx, 'rgba(255, 244, 200, 0.45)', () =>
    ctx.ellipse(-4, -2, 6, 2.2, -0.4, 0, Math.PI * 2),
  )
  ctx.restore()
  strokeShape(ctx, '#7c6420', 0.9, shell)
}

// Planorbella duryi: flat pink spiral seen face-on, red body below
export function drawFaunaRamshorn(ctx: Ctx): void {
  fillShape(ctx, '#d62f3c', () => {
    ctx.moveTo(-10, 14)
    ctx.quadraticCurveTo(-6, 9.5, 4, 9.5)
    ctx.quadraticCurveTo(12, 9.8, 14, 14)
    ctx.closePath()
  })
  strokeShape(ctx, '#d62f3c', 1, () => {
    ctx.moveTo(10, 11)
    ctx.quadraticCurveTo(16, 5, 21, 4)
    ctx.moveTo(11, 12)
    ctx.quadraticCurveTo(18, 9, 22, 10)
  })
  fillShape(ctx, '#f4a3b6', () => ctx.arc(0, 1, 11.5, 0, Math.PI * 2))
  fillShape(ctx, '#e88aa1', () => ctx.arc(0.6, 1.6, 9.5, 0, Math.PI * 2))
  strokeShape(ctx, '#c86a83', 1.1, () => {
    let first = true
    for (let t = 0; t < Math.PI * 6; t += 0.18) {
      const r = 10.6 - t * 0.52
      if (r < 0.8) break
      const x = Math.cos(t + Math.PI) * r + 0.3,
        y = Math.sin(t + Math.PI) * r + 1.3
      if (first) {
        ctx.moveTo(x, y)
        first = false
      } else ctx.lineTo(x, y)
    }
  })
  fillShape(ctx, 'rgba(255, 238, 243, 0.7)', () =>
    ctx.ellipse(-4, -5, 4.6, 1.6, -0.5, 0, Math.PI * 2),
  )
  strokeShape(ctx, '#b65674', 0.8, () => ctx.arc(0, 1, 11.5, 0, Math.PI * 2))
}
