import { fillShape, strokeShape, type Ctx } from '../fauna'

// Caridina multidentata: glassy, twice a cherry shrimp, with a row of brown dashes
export function drawFaunaAmano(ctx: Ctx): void {
  const glass = 'rgba(205, 214, 214, 0.78)',
    deep = '#8c9696',
    dash = '#8a4a2c'
  strokeShape(ctx, deep, 0.6, () => {
    ctx.moveTo(15, -4)
    ctx.bezierCurveTo(24, -16, 32, -16, 36, -10)
  })
  strokeShape(ctx, deep, 0.6, () => {
    ctx.moveTo(15, -3)
    ctx.bezierCurveTo(25, -6, 32, 1, 33, 8)
  })
  ;[2, 5.5, 9, 12.5].forEach((x) =>
    strokeShape(ctx, deep, 0.9, () => {
      ctx.moveTo(x, 2.5)
      ctx.quadraticCurveTo(x + 1.5, 8.5, x + 0.5, 14)
    }),
  )
  const segs = [
    [-4, -1.2, 5.8],
    [-9, 0.2, 5.3],
    [-13.4, 2.8, 4.7],
    [-16.6, 6.4, 4],
    [-18, 10.2, 3.3],
  ]
  ;[...segs]
    .reverse()
    .forEach(([x, y, r]) =>
      fillShape(ctx, glass, () => ctx.ellipse(x, y, r * 1.05, r, 0.4, 0, Math.PI * 2)),
    )
  ;[
    [-18, 13.6, -0.3],
    [-16, 14, 0.4],
    [-19.8, 12.8, -0.9],
  ].forEach(([x, y, a]) =>
    fillShape(ctx, '#9aa5a5', () => ctx.ellipse(x, y, 3.4, 1.4, a, 0, Math.PI * 2)),
  )
  fillShape(ctx, glass, () => ctx.ellipse(6, -1.5, 10.5, 6, -0.08, 0, Math.PI * 2))
  fillShape(ctx, glass, () => {
    ctx.moveTo(14, -4.5)
    ctx.lineTo(24, -6.5)
    ctx.lineTo(14.5, -2)
    ctx.closePath()
  })
  // Pale back stripe and the brown dash rows that name the species
  strokeShape(ctx, 'rgba(255, 250, 238, 0.9)', 1.3, () => {
    ctx.moveTo(-17, 1.5)
    ctx.quadraticCurveTo(-11, -6, 0, -6.6)
    ctx.quadraticCurveTo(8, -7.6, 13, -6)
  })
  ;[
    [-15, 5.5],
    [-12.5, 3],
    [-9, 1.6],
    [-5, 0.6],
    [-1, 0.2],
    [3, 0.4],
    [7, 0.8],
    [10.5, 0.4],
  ].forEach(([x, y]) =>
    fillShape(ctx, dash, () => ctx.ellipse(x, y, 1.3, 0.55, 0.15, 0, Math.PI * 2)),
  )
  ;[
    [-11, 6.5],
    [-6.5, 4.6],
    [-1.5, 3.6],
    [3.5, 3.8],
    [8, 3.2],
  ].forEach(([x, y]) => fillShape(ctx, dash, () => ctx.ellipse(x, y, 1, 0.45, 0.1, 0, Math.PI * 2)))
  strokeShape(ctx, deep, 1.5, () => {
    ctx.moveTo(13, -3.5)
    ctx.lineTo(15.5, -5.5)
  })
  fillShape(ctx, '#111', () => ctx.arc(15.8, -5.8, 1.8, 0, Math.PI * 2))
  fillShape(ctx, '#fff', () => ctx.arc(15.2, -6.4, 0.5, 0, Math.PI * 2))
}
