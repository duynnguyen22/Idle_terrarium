import { fillShape, strokeShape, type Ctx } from '../fauna'
import { decorEllipse, decorRect, decorPoly } from './shapes'

function drawStreetLamp(ctx: Ctx): void {
  const iron = '#2b3430'
  decorRect(ctx, iron, -6, 26, 12, 4, 1.2)
  decorRect(ctx, iron, -3.5, 20, 7, 7, 1.5)
  decorRect(ctx, iron, -1.4, -38, 2.8, 60)
  strokeShape(ctx, iron, 1.6, () => {
    ctx.moveTo(-1, -26)
    ctx.quadraticCurveTo(-7, -28, -6, -33)
    ctx.moveTo(1, -26)
    ctx.quadraticCurveTo(7, -28, 6, -33)
  })
  // Lantern head
  decorPoly(ctx, iron, [
    [-8, -40],
    [8, -40],
    [5, -54],
    [-5, -54],
  ])
  decorPoly(ctx, '#fff1bf', [
    [-6, -41.5],
    [6, -41.5],
    [4, -52.5],
    [-4, -52.5],
  ])
  decorEllipse(ctx, '#ffe08a', 0, -46, 2.6, 3.4)
  strokeShape(ctx, iron, 1, () => {
    ctx.moveTo(0, -41.5)
    ctx.lineTo(0, -52.5)
  })
  decorPoly(ctx, iron, [
    [-10, -54],
    [10, -54],
    [0, -61],
  ])
  decorEllipse(ctx, iron, 0, -62, 1.6, 1.6)
}

function drawBridge(ctx: Ctx): void {
  // Arched wooden footbridge
  const wood = '#a8743f',
    dark = '#6e4a28',
    light = '#c99559'
  const deck = (t: number) => -t * t * 18 + 18 // y of the deck top at t in -1..1 (relative)
  strokeShape(ctx, dark, 4, () => {
    ctx.moveTo(-30, 30)
    ctx.lineTo(-30, 14)
    ctx.moveTo(30, 30)
    ctx.lineTo(30, 14)
  })
  fillShape(ctx, wood, () => {
    ctx.moveTo(-34, 14)
    ctx.quadraticCurveTo(0, -22, 34, 14)
    ctx.lineTo(34, 20)
    ctx.quadraticCurveTo(0, -12, -34, 20)
    ctx.closePath()
  })
  strokeShape(ctx, light, 1.4, () => {
    ctx.moveTo(-33, 14.5)
    ctx.quadraticCurveTo(0, -21, 33, 14.5)
  })
  // Planks
  for (let i = -6; i <= 6; i++) {
    const t = i / 7.2,
      x = t * 33,
      y = 16 - (1 - t * t) * 17.5
    strokeShape(ctx, dark, 0.9, () => {
      ctx.moveTo(x, y - 2.5)
      ctx.lineTo(x, y + 3)
    })
  }
  // Rail and posts
  for (let i = -3; i <= 3; i++) {
    const t = i / 3.4,
      x = t * 31,
      y = 14 - (1 - t * t) * 17.5
    strokeShape(ctx, dark, 2.2, () => {
      ctx.moveTo(x, y)
      ctx.lineTo(x, y - 10)
    })
  }
  strokeShape(ctx, wood, 2.6, () => {
    ctx.moveTo(-31, 4)
    ctx.quadraticCurveTo(0, -31, 31, 4)
  })
  void deck
}

function drawStoneSteps(ctx: Ctx): void {
  // A short mossy stone stair, to lead the eye up a slope
  const stone = '#b3ad9e',
    top = '#cbc5b6',
    moss = '#5f8f45'
  ;[
    [-26, 20, 20, 10],
    [-12, 10, 20, 20],
    [2, 0, 22, 30],
    [14, -10, 14, 40],
  ].forEach(([x, y, w, h], i) => {
    decorRect(ctx, i % 2 ? '#a7a092' : stone, x, y, w, h, 1.5)
    decorRect(ctx, top, x, y, w, 3, [1.5, 1.5, 0, 0])
  })
  ;[
    [-20, 20, 5],
    [-4, 10, 4.5],
    [10, 0, 5],
    [22, -10, 4],
  ].forEach(([x, y, r]) => decorEllipse(ctx, moss, x, y, r, 1.8))
  ;[
    [-26, 29, 4],
    [27, 28, 5],
    [-13, 29, 3],
  ].forEach(([x, y, r]) => decorEllipse(ctx, moss, x, y, r, 2))
  strokeShape(ctx, '#8e8778', 0.8, () => {
    ctx.moveTo(8, 12)
    ctx.lineTo(13, 18)
    ctx.moveTo(-6, 22)
    ctx.lineTo(-2, 26)
    ctx.moveTo(20, 4)
    ctx.lineTo(24, 10)
  })
}

function drawRuinArch(ctx: Ctx): void {
  const stone = '#b8b1a0',
    shade = '#958e7e',
    moss = '#5f8f45'
  decorRect(ctx, shade, -26, 24, 52, 6, 1.5)
  decorRect(ctx, stone, -22, -10, 11, 35, 1)
  decorRect(ctx, stone, 11, 2, 11, 23, 1)
  // Broken arch: left half only
  fillShape(ctx, stone, () => {
    ctx.moveTo(-22, -10)
    ctx.quadraticCurveTo(-20, -30, 0, -32)
    ctx.lineTo(3, -26)
    ctx.lineTo(-1, -24)
    ctx.quadraticCurveTo(-11, -22, -11, -10)
    ctx.closePath()
  })
  strokeShape(ctx, shade, 0.9, () => {
    ctx.moveTo(-22, 3)
    ctx.lineTo(-11, 3)
    ctx.moveTo(-22, 14)
    ctx.lineTo(-11, 14)
    ctx.moveTo(11, 13)
    ctx.lineTo(22, 13)
    ctx.moveTo(-17, -24)
    ctx.lineTo(-12, -18)
    ctx.moveTo(-8, -30)
    ctx.lineTo(-5, -23)
  })
  decorPoly(ctx, shade, [
    [11, 2],
    [16, -2],
    [22, 1],
    [22, 2],
  ])
  // Moss creeping over the stones
  ;[
    [-17, -12, 6, 2.6],
    [-5, -31, 5, 2.2],
    [16, 2, 6, 2.6],
    [-20, 24, 7, 2.4],
    [18, 24, 6, 2.2],
  ].forEach(([x, y, rx, ry]) => decorEllipse(ctx, moss, x, y, rx, ry))
  strokeShape(ctx, moss, 1.4, () => {
    ctx.moveTo(-20, -12)
    ctx.quadraticCurveTo(-23, -2, -21, 6)
  })
  decorPoly(ctx, shade, [
    [-4, 30],
    [4, 26],
    [9, 30],
  ])
}

export const PATHS_SPRITES = {
  deco_street_lamp: drawStreetLamp,
  deco_bridge: drawBridge,
  deco_stone_steps: drawStoneSteps,
  deco_ruin_arch: drawRuinArch,
}
