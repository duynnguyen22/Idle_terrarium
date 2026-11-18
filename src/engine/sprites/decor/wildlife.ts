import { fillShape, strokeShape, type Ctx } from '../fauna'
import { decorEllipse, decorRect, decorPoly } from './shapes'

function drawFox(ctx: Ctx): void {
  const fur = '#d9772b',
    dark = '#a8551b',
    cream = '#f6ead6'
  fillShape(ctx, fur, () => {
    ctx.moveTo(-6, 28)
    ctx.bezierCurveTo(-24, 30, -26, 12, -14, 10)
    ctx.bezierCurveTo(-18, 18, -12, 24, -2, 24)
    ctx.closePath()
  })
  fillShape(ctx, cream, () => {
    ctx.moveTo(-20, 22)
    ctx.bezierCurveTo(-26, 16, -22, 10, -16, 10.5)
    ctx.bezierCurveTo(-21, 14, -21, 18, -18, 22.5)
    ctx.closePath()
  })
  fillShape(ctx, fur, () => {
    ctx.moveTo(-10, 29)
    ctx.bezierCurveTo(-14, 10, -6, -2, 4, -4)
    ctx.bezierCurveTo(10, 4, 12, 18, 10, 29)
    ctx.closePath()
  })
  fillShape(ctx, cream, () => {
    ctx.moveTo(2, 2)
    ctx.bezierCurveTo(8, 6, 9, 16, 6, 22)
    ctx.bezierCurveTo(2, 16, 0, 8, 2, 2)
    ctx.closePath()
  })
  decorRect(ctx, '#3a2a20', 2, 26, 4, 4, 1.4)
  decorRect(ctx, '#3a2a20', 7, 26, 4, 4, 1.4)
  // Head
  fillShape(ctx, fur, () => {
    ctx.moveTo(-4, -6)
    ctx.bezierCurveTo(-4, -14, 4, -16, 9, -12)
    ctx.lineTo(18, -6)
    ctx.bezierCurveTo(14, -2, 8, 0, 2, 0)
    ctx.closePath()
  })
  fillShape(ctx, cream, () => {
    ctx.moveTo(6, -5)
    ctx.lineTo(18, -6)
    ctx.bezierCurveTo(14, -1, 8, 0.5, 4, -1)
    ctx.closePath()
  })
  decorEllipse(ctx, '#1d1814', 18, -6.2, 1.4, 1.2)
  decorPoly(ctx, fur, [
    [-3, -11],
    [-2, -22],
    [4, -14],
  ])
  decorPoly(ctx, dark, [
    [-1.6, -12.6],
    [-1.6, -19],
    [2.2, -14],
  ])
  decorPoly(ctx, fur, [
    [3, -14],
    [8, -23],
    [9, -13],
  ])
  decorPoly(ctx, dark, [
    [4.6, -14.4],
    [7.6, -20],
    [8, -14],
  ])
  strokeShape(ctx, '#1d1814', 1.1, () => {
    ctx.moveTo(8, -10)
    ctx.quadraticCurveTo(10, -11.2, 12, -10)
  })
}

function drawDeer(ctx: Ctx): void {
  const coat = '#b7834e',
    dark = '#8a5f34',
    cream = '#efe1c8'
  ;[
    [-12, 30],
    [-7, 30],
    [10, 30],
    [14, 30],
  ].forEach(([x, y]) =>
    strokeShape(ctx, dark, 2.4, () => {
      ctx.moveTo(x, y - 14)
      ctx.lineTo(x, y)
    }),
  )
  decorEllipse(ctx, coat, 0, 10, 17, 8)
  decorEllipse(ctx, cream, 1, 14, 12, 3.4)
  ;[
    [-8, 7],
    [-3, 5],
    [3, 6],
    [-6, 11],
    [1, 10],
    [7, 8],
  ].forEach(([x, y]) => decorEllipse(ctx, '#f4ead8', x, y, 1.3, 1))
  decorPoly(ctx, coat, [
    [11, 6],
    [19, -10],
    [24, -8],
    [17, 10],
  ])
  // Head and ears
  fillShape(ctx, coat, () => {
    ctx.moveTo(18, -13)
    ctx.bezierCurveTo(22, -17, 28, -15, 31, -10)
    ctx.bezierCurveTo(29, -7, 24, -6, 20, -7)
    ctx.closePath()
  })
  decorEllipse(ctx, '#1d1814', 30.6, -10, 1.2, 1)
  decorEllipse(ctx, '#1d1814', 24.5, -12.4, 1.1, 1.1)
  decorEllipse(ctx, coat, 17.5, -16, 4.5, 2, -0.6)
  decorEllipse(ctx, '#d9a87a', 17.5, -16, 2.8, 1, -0.6)
  decorEllipse(ctx, coat, -16, 5, 2.4, 3.2, 0.4)
  decorEllipse(ctx, '#ffffff', -16.6, 6, 1.2, 1.8, 0.4)
}

function drawRabbit(ctx: Ctx): void {
  const fur = '#f2efe8',
    shade = '#d8d2c6'
  decorEllipse(ctx, fur, -2, 18, 14, 12)
  decorEllipse(ctx, shade, -6, 22, 9, 7)
  decorEllipse(ctx, fur, -15, 22, 4.4, 4.4)
  decorEllipse(ctx, fur, 8, 27, 6, 3)
  decorEllipse(ctx, fur, 8, 2, 9, 8.4)
  fillShape(ctx, fur, () => ctx.ellipse(4, -14, 3.4, 10, -0.18, 0, Math.PI * 2))
  fillShape(ctx, '#f0b8b4', () => ctx.ellipse(4.2, -14, 1.6, 7.4, -0.18, 0, Math.PI * 2))
  fillShape(ctx, fur, () => ctx.ellipse(10, -12, 3.2, 9.4, 0.25, 0, Math.PI * 2))
  decorEllipse(ctx, '#3b2420', 12.4, 1, 1.4, 1.6)
  decorEllipse(ctx, '#e8a0a0', 16.6, 4.6, 1.1, 0.8)
}

function drawOwl(ctx: Ctx): void {
  decorRect(ctx, '#7a5634', -11, 18, 22, 12, 2)
  decorEllipse(ctx, '#a97b4c', 0, 18, 11, 2.8)
  const body = '#8a6a4a',
    belly = '#d8c3a0'
  decorEllipse(ctx, body, 0, 2, 11, 15)
  decorEllipse(ctx, belly, 0, 6, 7, 10)
  for (let i = 0; i < 6; i++)
    strokeShape(ctx, '#a68862', 0.9, () => {
      const x = -4 + (i % 3) * 4,
        y = 2 + Math.floor(i / 3) * 5
      ctx.moveTo(x - 1.5, y)
      ctx.quadraticCurveTo(x, y + 1.6, x + 1.5, y)
    })
  decorEllipse(ctx, '#6f5236', -9, 4, 3.6, 9, 0.12)
  decorEllipse(ctx, '#6f5236', 9, 4, 3.6, 9, -0.12)
  decorPoly(ctx, body, [
    [-10, -9],
    [-8, -18],
    [-3, -12],
  ])
  decorPoly(ctx, body, [
    [10, -9],
    [8, -18],
    [3, -12],
  ])
  ;[
    [-4.4, -8],
    [4.4, -8],
  ].forEach(([x, y]) => {
    decorEllipse(ctx, '#f4ead8', x, y, 4.2, 4.2)
    decorEllipse(ctx, '#e8a33a', x, y, 2.6, 2.6)
    decorEllipse(ctx, '#1d1814', x, y, 1.3, 1.3)
  })
  decorPoly(ctx, '#d39a3a', [
    [-1.4, -5],
    [1.4, -5],
    [0, -1.6],
  ])
  ;[
    [-4, 17],
    [4, 17],
  ].forEach(([x, y]) => decorEllipse(ctx, '#c9932f', x, y, 2.6, 1.2))
}

export const WILDLIFE_SPRITES = {
  deco_fox: drawFox,
  deco_deer: drawDeer,
  deco_rabbit: drawRabbit,
  deco_owl: drawOwl,
}
