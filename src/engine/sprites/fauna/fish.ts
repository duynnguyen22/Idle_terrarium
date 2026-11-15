import { fillShape, strokeShape, type Ctx } from './shapes'

export function drawFaunaMedaka(ctx: Ctx) {
  const gold = '#f59f00',
    back = '#d9730b',
    belly = '#ffe08a',
    fin = 'rgba(255, 192, 120, 0.85)'
  // Tail fin with rays
  fillShape(ctx, gold, () => {
    ctx.moveTo(-13, 0)
    ctx.lineTo(-25, -7.5)
    ctx.quadraticCurveTo(-21.5, 0, -25, 7.5)
    ctx.closePath()
  })
  ;[-5, -2, 2, 5].forEach((y) =>
    strokeShape(ctx, '#ffd8a8', 0.7, () => {
      ctx.moveTo(-14, 0)
      ctx.lineTo(-23.5, y * 1.2)
    }),
  )
  // Dorsal fin set far back, long anal fin below
  fillShape(ctx, fin, () => {
    ctx.moveTo(-4, -4.6)
    ctx.lineTo(-9, -9.5)
    ctx.lineTo(-12.5, -3)
    ctx.closePath()
  })
  fillShape(ctx, fin, () => {
    ctx.moveTo(0, 4.6)
    ctx.lineTo(-11, 3)
    ctx.lineTo(-10.5, 6.5)
    ctx.lineTo(-1.5, 6.6)
    ctx.closePath()
  })
  // Body
  const body = () => {
    ctx.moveTo(17.5, 0)
    ctx.bezierCurveTo(13, -6.5, -4, -7, -13.5, -2)
    ctx.quadraticCurveTo(-15, 0, -13.5, 2)
    ctx.bezierCurveTo(-4, 6.5, 13, 6, 17.5, 0)
  }
  fillShape(ctx, gold, body)
  ctx.save()
  ctx.beginPath()
  body()
  ctx.clip()
  fillShape(ctx, back, () => ctx.ellipse(0, -7, 22, 4, 0, 0, Math.PI * 2))
  fillShape(ctx, belly, () => ctx.ellipse(2, 6, 18, 3.6, 0, 0, Math.PI * 2))
  ctx.restore()
  // Pectoral fin and lateral line
  fillShape(ctx, fin, () => ctx.ellipse(5.5, 2, 3.6, 1.6, 0.5, 0, Math.PI * 2))
  strokeShape(ctx, '#e8590c', 0.7, () => {
    ctx.moveTo(7, -0.5)
    ctx.quadraticCurveTo(-3, 0.5, -12, 0)
  })
  // Large silver eye and upturned mouth
  fillShape(ctx, '#e9ecef', () => ctx.arc(11.5, -1.3, 3.3, 0, Math.PI * 2))
  fillShape(ctx, '#4dabf7', () => ctx.arc(11.7, -1.2, 2.2, 0, Math.PI * 2))
  fillShape(ctx, '#111', () => ctx.arc(11.8, -1.1, 1.5, 0, Math.PI * 2))
  fillShape(ctx, '#fff', () => ctx.arc(11, -2.2, 0.7, 0, Math.PI * 2))
  strokeShape(ctx, '#a34700', 0.8, () => {
    ctx.moveTo(15.8, -1.3)
    ctx.lineTo(17.6, -0.4)
  })
}
