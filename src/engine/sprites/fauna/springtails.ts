import { fillShape, strokeShape, type Ctx } from './shapes'

export function drawFaunaSpringtails(ctx: Ctx) {
  // A decaying leaf as their ground, so the white bodies read on any background
  fillShape(ctx, '#7a4a20', () => {
    ctx.moveTo(-24, 10)
    ctx.bezierCurveTo(-14, 0, 12, 0, 24, 9)
    ctx.bezierCurveTo(12, 16, -14, 17, -24, 10)
  })
  strokeShape(ctx, '#5c3615', 0.9, () => {
    ctx.moveTo(-22, 10)
    ctx.lineTo(22, 9.5)
    ;[-14, -6, 2, 10].forEach((x) => {
      ctx.moveTo(x, 10)
      ctx.lineTo(x + 5, 5.5)
      ctx.moveTo(x, 10)
      ctx.lineTo(x + 5, 14)
    })
  })
  const bug = (x: number, y: number, a: number, s: number) => {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(a)
    ctx.scale(s, s)
    strokeShape(ctx, '#b8bfc6', 0.6, () => {
      ctx.moveTo(4, -0.6)
      ctx.lineTo(8, -3.5)
      ctx.moveTo(4, 0)
      ctx.lineTo(8.5, -0.8)
    })
    strokeShape(ctx, '#b8bfc6', 0.6, () => {
      ctx.moveTo(-3.5, 1.3)
      ctx.lineTo(-1, 3.2)
    })
    fillShape(ctx, '#ffffff', () => ctx.ellipse(-0.5, 0, 4.4, 1.9, 0, 0, Math.PI * 2))
    fillShape(ctx, '#f1f3f5', () => ctx.arc(4, -0.3, 1.5, 0, Math.PI * 2))
    fillShape(ctx, '#1a1a1a', () => ctx.arc(4.6, -0.7, 0.45, 0, Math.PI * 2))
    ctx.restore()
  }
  bug(-13, 7.5, -0.15, 1.15)
  bug(-1, 5, 0.1, 1.3)
  bug(11, 8, -0.25, 1.05)
  bug(3, 11.5, 0.2, 0.9)
  bug(-7, 12, 0.05, 0.8)
}
