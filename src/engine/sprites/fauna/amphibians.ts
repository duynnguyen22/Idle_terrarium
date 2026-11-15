import { fillShape, strokeShape, type Ctx } from './shapes'

export function drawFaunaTreeFrog(ctx: Ctx) {
  const green = '#3fb950',
    shade = '#2b8a3e',
    light = '#8ce99a',
    orange = '#f76707',
    blue = '#1c64c4'
  // Back leg, folded under the body
  fillShape(ctx, shade, () => ctx.ellipse(-11, 7, 11, 6.5, -0.35, 0, Math.PI * 2))
  strokeShape(ctx, shade, 2.6, () => {
    ctx.moveTo(-6, 11)
    ctx.quadraticCurveTo(-14, 13, -18, 13)
  })
  ;[
    [-21.5, 13.2],
    [-18.8, 14.4],
    [-15.8, 14.6],
  ].forEach(([x, y]) => fillShape(ctx, orange, () => ctx.arc(x, y, 1.7, 0, Math.PI * 2)))
  // Body
  const body = () => {
    ctx.moveTo(-19, 7)
    ctx.bezierCurveTo(-21, -5, -6, -12, 8, -10.5)
    ctx.bezierCurveTo(19, -9.5, 24, -3, 22.5, 2.5)
    ctx.bezierCurveTo(21, 8.5, 9, 11.5, -3, 11.5)
    ctx.bezierCurveTo(-12, 11.5, -18, 10.5, -19, 7)
  }
  fillShape(ctx, green, body)
  // Cream throat and belly
  fillShape(ctx, '#f3efc7', () => {
    ctx.moveTo(4, 9)
    ctx.bezierCurveTo(10, 5, 19, 4, 22, 3)
    ctx.bezierCurveTo(19, 9, 10, 11.5, 2, 11.2)
  })
  // Blue flank with pale bars
  ctx.save()
  ctx.beginPath()
  body()
  ctx.clip()
  fillShape(ctx, blue, () => {
    ctx.moveTo(-18, 6)
    ctx.bezierCurveTo(-10, 3, 0, 4.5, 6, 7.5)
    ctx.bezierCurveTo(0, 10, -10, 11, -18, 9.5)
  })
  ;[-13, -8, -3].forEach((x) =>
    fillShape(ctx, '#fff3bf', () => ctx.ellipse(x, 7, 0.9, 2.4, 0.25, 0, Math.PI * 2)),
  )
  ctx.restore()
  // Back highlight
  strokeShape(ctx, light, 1.8, () => {
    ctx.moveTo(-12, -4)
    ctx.quadraticCurveTo(-3, -9.5, 7, -9)
  })
  // Front leg and toe pads
  strokeShape(ctx, shade, 3.4, () => {
    ctx.moveTo(9, 6)
    ctx.quadraticCurveTo(13, 9, 12, 13)
  })
  ;[
    [9.5, 14.2],
    [12.5, 14.8],
    [15.5, 14.2],
  ].forEach(([x, y]) => fillShape(ctx, orange, () => ctx.arc(x, y, 1.7, 0, Math.PI * 2)))
  // Mouth line
  strokeShape(ctx, shade, 0.9, () => {
    ctx.moveTo(14, 1.5)
    ctx.quadraticCurveTo(19, 3, 22.5, 2)
  })
  // Red eye with vertical pupil
  fillShape(ctx, shade, () => ctx.arc(13.5, -8.5, 6.6, 0, Math.PI * 2))
  fillShape(ctx, '#e03131', () => ctx.arc(13.5, -8.5, 5.6, 0, Math.PI * 2))
  fillShape(ctx, '#ff8787', () => ctx.arc(12.4, -10, 2.4, 0, Math.PI * 2))
  fillShape(ctx, '#111', () => ctx.ellipse(13.6, -8.4, 1.4, 4, 0, 0, Math.PI * 2))
  fillShape(ctx, '#fff', () => ctx.arc(11.8, -11, 1.1, 0, Math.PI * 2))
  fillShape(ctx, '#1b2a1f', () => ctx.arc(21, -2.5, 0.7, 0, Math.PI * 2))
}
