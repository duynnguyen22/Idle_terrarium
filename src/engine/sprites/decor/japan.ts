import { fillShape, strokeShape, type Ctx } from '../fauna'
import { decorEllipse, decorRect, decorShine } from './shapes'

function drawTorii(ctx: Ctx): void {
  const red = '#c8382c',
    dred = '#9c271e',
    ink = '#2a2622'
  decorRect(ctx, ink, -19.5, 25, 7, 5, 1)
  decorRect(ctx, ink, 12.5, 25, 7, 5, 1)
  decorRect(ctx, red, -18.5, -18, 5, 44)
  decorRect(ctx, red, 13.5, -18, 5, 44)
  decorRect(ctx, dred, -18.5, -18, 1.6, 44)
  decorRect(ctx, dred, 13.5, -18, 1.6, 44)
  decorRect(ctx, red, -24, -13, 48, 4.5, 1)
  decorRect(ctx, red, -2.5, -21, 5, 8)
  decorRect(ctx, '#2f2a24', -3.5, -19.5, 7, 5, 0.8)
  // Top beam: red, then a black cap that sweeps up at the ends
  fillShape(ctx, red, () => {
    ctx.moveTo(-28, -22)
    ctx.quadraticCurveTo(0, -18.5, 28, -22)
    ctx.lineTo(28, -18)
    ctx.quadraticCurveTo(0, -14.5, -28, -18)
    ctx.closePath()
  })
  fillShape(ctx, ink, () => {
    ctx.moveTo(-31, -28)
    ctx.quadraticCurveTo(0, -21, 31, -28)
    ctx.lineTo(29, -22)
    ctx.quadraticCurveTo(0, -18, -29, -22)
    ctx.closePath()
  })
}

function drawPagoda(ctx: Ctx): void {
  const roof = '#3e4a46',
    wall = '#c94a35',
    stone = '#b9b2a2'
  decorRect(ctx, stone, -16, 25, 32, 5, 1)
  const tier = (y: number, w: number, h: number) => {
    decorRect(ctx, wall, -w * 0.62, y - h, w * 1.24, h)
    decorRect(ctx, '#f3e3b4', -w * 0.2, y - h * 0.8, w * 0.4, h * 0.55, 1)
    fillShape(ctx, roof, () => {
      ctx.moveTo(-w - 3, y - h - 1)
      ctx.quadraticCurveTo(-w * 0.4, y - h - 3, 0, y - h - 9)
      ctx.quadraticCurveTo(w * 0.4, y - h - 3, w + 3, y - h - 1)
      ctx.lineTo(w, y - h + 2)
      ctx.lineTo(-w, y - h + 2)
      ctx.closePath()
    })
  }
  tier(25, 18, 13)
  tier(10, 14, 10)
  tier(-2, 10, 8)
  strokeShape(ctx, '#c9a35f', 1.6, () => {
    ctx.moveTo(0, -19)
    ctx.lineTo(0, -30)
  })
  ;[-22, -25.5, -29].forEach((y) => decorEllipse(ctx, '#c9a35f', 0, y, 2, 0.9))
}

function drawLittleMonk(ctx: Ctx): void {
  // Cheerful novice figurine, a staple of Vietnamese miniature gardens
  decorEllipse(ctx, '#9a6f45', 0, 26, 11, 4)
  fillShape(ctx, '#d9a441', () => {
    ctx.moveTo(-9, 26)
    ctx.quadraticCurveTo(-11, 4, 0, 2)
    ctx.quadraticCurveTo(11, 4, 9, 26)
    ctx.closePath()
  })
  fillShape(ctx, '#b8862d', () => {
    ctx.moveTo(-9, 26)
    ctx.quadraticCurveTo(-11, 4, -3, 2.6)
    ctx.quadraticCurveTo(-6, 14, -4, 26)
    ctx.closePath()
  })
  strokeShape(ctx, '#b8862d', 1, () => {
    ctx.moveTo(-3, 4)
    ctx.lineTo(5, 16)
  })
  // Hands together
  decorEllipse(ctx, '#f1cfae', 2.5, 12, 3, 3.6)
  // Round head, shaved, with a happy closed-eye smile
  decorEllipse(ctx, '#f3d4b5', 0, -8, 10, 10.4)
  decorShine(ctx, -3.5, -13, 3.5, 2, 0.35)
  strokeShape(ctx, '#3a2a20', 1.1, () => {
    ctx.moveTo(-5.6, -8)
    ctx.quadraticCurveTo(-3.6, -10, -1.6, -8)
    ctx.moveTo(2.6, -8)
    ctx.quadraticCurveTo(4.6, -10, 6.6, -8)
  })
  strokeShape(ctx, '#b35a4a', 1, () => {
    ctx.moveTo(-1, -3)
    ctx.quadraticCurveTo(1, -1, 3, -3)
  })
  decorEllipse(ctx, '#f0a998', -6.5, -4.5, 1.6, 1)
  decorEllipse(ctx, '#f0a998', 7.5, -4.5, 1.6, 1)
  // Tuft of hair at the forehead
  decorEllipse(ctx, '#2c2420', 0, -17.6, 2.2, 1.3)
}

export const JAPAN_SPRITES = {
  deco_torii: drawTorii,
  deco_pagoda: drawPagoda,
  deco_little_monk: drawLittleMonk,
}
