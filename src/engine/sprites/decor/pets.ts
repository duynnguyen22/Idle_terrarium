import { fillShape, strokeShape, type Ctx } from '../fauna'
import { decorEllipse, decorRect, decorPoly, decorShine } from './shapes'

function drawCat(ctx: Ctx): void {
  // Curled up asleep
  const fur = '#e09b52',
    stripe = '#b8722f'
  decorEllipse(ctx, fur, 0, 20, 21, 10)
  ;[
    [-12, 0.4],
    [-5, 0.2],
    [2, 0],
    [9, -0.2],
  ].forEach(([x, r]) =>
    strokeShape(ctx, stripe, 1.6, () => {
      ctx.moveTo(x, 11.5)
      ctx.quadraticCurveTo(x + 2, 15 + r, x + 1, 19)
    }),
  )
  // Tail wrapping round the front
  strokeShape(ctx, fur, 5, () => {
    ctx.moveTo(-19, 24)
    ctx.quadraticCurveTo(-8, 32, 12, 28)
  })
  strokeShape(ctx, stripe, 1.3, () => {
    ctx.moveTo(-2, 29.2)
    ctx.lineTo(-1, 26.6)
    ctx.moveTo(5, 29)
    ctx.lineTo(5.6, 26.4)
  })
  // Head resting on the paws
  decorEllipse(ctx, fur, 14, 17, 9, 7.6)
  decorPoly(ctx, fur, [
    [8, 12],
    [9.5, 4],
    [13, 10],
  ])
  decorPoly(ctx, fur, [
    [15, 10],
    [19.5, 4],
    [20.5, 13],
  ])
  decorPoly(ctx, '#f0b8b4', [
    [9.4, 10.5],
    [10, 6.5],
    [12, 10],
  ])
  strokeShape(ctx, '#5a3a20', 1, () => {
    ctx.moveTo(12, 17)
    ctx.quadraticCurveTo(13.6, 18.4, 15.2, 17)
    ctx.moveTo(17.4, 16.4)
    ctx.quadraticCurveTo(19, 17.8, 20.6, 16.4)
  })
  decorEllipse(ctx, '#d9776a', 18.6, 20, 1, 0.7)
  decorEllipse(ctx, '#f5e6d3', 12, 25, 5, 2.4)
}

function drawDucklings(ctx: Ctx): void {
  const duck = (x: number, s: number, col: string) => {
    decorEllipse(ctx, col, x, 30 - 8 * s, 10 * s, 7 * s)
    decorEllipse(ctx, col, x + 7 * s, 30 - 17 * s, 5.4 * s, 5.4 * s)
    decorPoly(ctx, '#e8892f', [
      [x + 11.6 * s, 30 - 18 * s],
      [x + 16 * s, 30 - 16.6 * s],
      [x + 11.6 * s, 30 - 15 * s],
    ])
    decorEllipse(ctx, '#1d1814', x + 8.6 * s, 30 - 18.4 * s, 0.9 * s, 0.9 * s)
    decorEllipse(ctx, '#e8b92f', x - 2 * s, 30 - 9 * s, 5 * s, 3 * s, -0.3)
    decorPoly(ctx, col, [
      [x - 9 * s, 30 - 9 * s],
      [x - 14 * s, 30 - 13 * s],
      [x - 9 * s, 30 - 5 * s],
    ])
  }
  duck(-9, 0.9, '#f5d547')
  duck(10, 1.1, '#f7dd5c')
}

function drawTurtle(ctx: Ctx): void {
  const shell = '#5f7a3a',
    plate = '#7d9a4b',
    skin = '#a3a86a'
  decorEllipse(ctx, skin, -11, 26, 4, 3)
  decorEllipse(ctx, skin, 9, 26, 4, 3)
  decorPoly(ctx, skin, [
    [-17, 20],
    [-23, 23],
    [-16, 24],
  ])
  fillShape(ctx, skin, () => {
    ctx.moveTo(14, 19)
    ctx.quadraticCurveTo(22, 12, 27, 15)
    ctx.quadraticCurveTo(29, 21, 22, 22)
    ctx.lineTo(14, 24)
    ctx.closePath()
  })
  decorEllipse(ctx, '#1d1814', 24.6, 16, 1.1, 1.1)
  strokeShape(ctx, '#6d7240', 0.8, () => {
    ctx.moveTo(26, 19.5)
    ctx.quadraticCurveTo(24.6, 20.6, 23, 20.2)
  })
  fillShape(ctx, shell, () => {
    ctx.moveTo(-19, 23)
    ctx.bezierCurveTo(-19, 4, 17, 4, 17, 23)
    ctx.closePath()
  })
  decorRect(ctx, '#4b622c', -20, 21.5, 38, 3, 1.5)
  ;[
    [-1, 11.5, 5.5, 4],
    [-11, 16, 4.4, 3.6],
    [9, 16, 4.4, 3.6],
    [-4, 19, 4, 2.4],
    [5, 19.4, 3.6, 2.2],
  ].forEach(([x, y, rx, ry]) => decorEllipse(ctx, plate, x, y, rx, ry))
  decorShine(ctx, -6, 9, 4, 1.6, 0.25)
}

export const PETS_SPRITES = {
  deco_cat: drawCat,
  deco_ducklings: drawDucklings,
  deco_turtle: drawTurtle,
}
