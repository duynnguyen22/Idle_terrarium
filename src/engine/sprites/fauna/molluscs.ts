import { fillShape, strokeShape, type Ctx } from './shapes'

export function drawFaunaSnail(ctx: Ctx) {
  const skin = '#7c858c',
    skinLight = '#a8b0b6'
  // Foot and head
  fillShape(ctx, skin, () => {
    ctx.moveTo(-18, 14)
    ctx.quadraticCurveTo(-14, 10, -2, 10)
    ctx.lineTo(14, 8)
    ctx.bezierCurveTo(19, 3, 23, 6, 22, 11)
    ctx.quadraticCurveTo(21, 14, 16, 14)
    ctx.closePath()
  })
  strokeShape(ctx, skinLight, 1, () => {
    ctx.moveTo(-12, 12.5)
    ctx.lineTo(14, 11.5)
  })
  // Eye stalks with dark tips
  strokeShape(ctx, skin, 1.8, () => {
    ctx.moveTo(18, 5.5)
    ctx.quadraticCurveTo(19.5, -1, 22, -5)
    ctx.moveTo(20, 6)
    ctx.quadraticCurveTo(24, 1, 27, -1.5)
  })
  fillShape(ctx, '#2b3034', () => ctx.arc(22.2, -5.4, 1.3, 0, Math.PI * 2))
  fillShape(ctx, '#2b3034', () => ctx.arc(27.3, -1.8, 1.3, 0, Math.PI * 2))
  strokeShape(ctx, skin, 1.2, () => {
    ctx.moveTo(21.5, 10)
    ctx.lineTo(25, 11.5)
  })
  // Translucent amber shell with a flat spiral
  fillShape(ctx, '#d9480f', () => ctx.ellipse(-3, 1.5, 13.5, 10, -0.12, 0, Math.PI * 2))
  fillShape(ctx, '#f76707', () => ctx.ellipse(-3.5, 0.5, 11.5, 8.4, -0.12, 0, Math.PI * 2))
  fillShape(ctx, '#ffa94d', () => ctx.ellipse(-4.5, -1.5, 7.5, 5.2, -0.12, 0, Math.PI * 2))
  strokeShape(ctx, '#c2410c', 1.3, () => {
    let first = true
    for (let t = 0; t < Math.PI * 5; t += 0.2) {
      const r = 1 + t * 0.62
      const x = -3.5 + Math.cos(t) * r * 1.3
      const y = 0.8 + Math.sin(t) * r * 0.95
      if (first) {
        ctx.moveTo(x, y)
        first = false
      } else ctx.lineTo(x, y)
    }
  })
  strokeShape(ctx, 'rgba(255, 244, 230, 0.85)', 1.6, () => {
    ctx.moveTo(-12, -2)
    ctx.quadraticCurveTo(-9, -8, -2, -8.3)
  })
}
