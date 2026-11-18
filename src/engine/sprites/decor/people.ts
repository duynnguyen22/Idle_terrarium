import { fillShape, strokeShape, type Ctx } from '../fauna'
import { decorEllipse, decorRect, decorPoly, decorShine, decorFace } from './shapes'

function drawRaincoatKid(ctx: Ctx): void {
  // A child in a yellow raincoat under a blue umbrella
  decorRect(ctx, '#b8322a', -6.5, 24, 5.4, 6, [1, 1, 1.6, 1.6])
  decorRect(ctx, '#b8322a', 1, 24, 5.4, 6, [1, 1, 1.6, 1.6])
  fillShape(ctx, '#f2c94c', () => {
    ctx.moveTo(-6, -2)
    ctx.lineTo(6, -2)
    ctx.lineTo(10, 25)
    ctx.lineTo(-10, 25)
    ctx.closePath()
  })
  fillShape(ctx, '#d9ab2e', () => {
    ctx.moveTo(-6, -2)
    ctx.lineTo(-2, -2)
    ctx.lineTo(-4, 25)
    ctx.lineTo(-10, 25)
    ctx.closePath()
  })
  ;[5, 11, 17].forEach((y) => decorEllipse(ctx, '#8a6a1c', 2.4, y, 0.8, 0.8))
  decorFace(ctx, 1, -7, 6, '#f2d1b3')
  fillShape(ctx, '#f2c94c', () => {
    ctx.arc(0, -7.5, 7.4, Math.PI * 0.95, Math.PI * 2.02)
    ctx.quadraticCurveTo(4, -9, 3, -12.5)
    ctx.quadraticCurveTo(-2, -9, -7.2, -6)
    ctx.closePath()
  })
  // Arm and umbrella
  strokeShape(ctx, '#e3b63f', 3, () => {
    ctx.moveTo(3, 2)
    ctx.lineTo(9, 6)
  })
  strokeShape(ctx, '#3a2f26', 1.3, () => {
    ctx.moveTo(9.5, 8)
    ctx.lineTo(7, -24)
  })
  strokeShape(ctx, '#3a2f26', 1.3, () => {
    ctx.moveTo(9.5, 8)
    ctx.quadraticCurveTo(10.5, 10.5, 12, 8.5)
  })
  fillShape(ctx, '#2f6f9a', () => {
    ctx.moveTo(-15, -20)
    ctx.quadraticCurveTo(-11, -40, 7, -40)
    ctx.quadraticCurveTo(25, -38, 28, -18)
    ctx.quadraticCurveTo(23, -21, 18, -18.5)
    ctx.quadraticCurveTo(12, -22, 6.5, -19)
    ctx.quadraticCurveTo(0, -22, -4, -18.6)
    ctx.quadraticCurveTo(-9, -22, -15, -20)
    ctx.closePath()
  })
  strokeShape(ctx, '#245878', 1, () => {
    ctx.moveTo(7, -40)
    ctx.quadraticCurveTo(2, -30, -4, -19)
    ctx.moveTo(7, -40)
    ctx.quadraticCurveTo(13, -30, 18, -19)
  })
  decorShine(ctx, -2, -33, 6, 2.4, 0.25)
}

function drawHiker(ctx: Ctx): void {
  strokeShape(ctx, '#7a5a3a', 1.6, () => {
    ctx.moveTo(13, -6)
    ctx.lineTo(16, 30)
  })
  decorRect(ctx, '#3a2f26', -6, 26, 6, 4, 1.4)
  decorRect(ctx, '#3a2f26', 1.5, 26, 6.5, 4, 1.4)
  decorRect(ctx, '#6b5a43', -5, 10, 4.8, 17, 1)
  decorRect(ctx, '#5c4c38', 1.5, 10, 4.8, 17, 1)
  decorRect(ctx, '#d9772b', -13, -8, 9, 18, 3)
  decorRect(ctx, '#b35f1f', -13, 2, 9, 3, 1)
  decorRect(ctx, '#3f7a52', -6, -8, 13, 20, 3)
  strokeShape(ctx, '#36694a', 3, () => {
    ctx.moveTo(5, -4)
    ctx.lineTo(13, -3)
  })
  decorFace(ctx, 1, -13, 5.6, '#e8c3a0')
  decorRect(ctx, '#8a6a3c', -6.5, -19.5, 14, 4, 2)
  decorRect(ctx, '#8a6a3c', -9, -16.6, 19, 1.8, 1)
}

function drawReader(ctx: Ctx): void {
  // Sitting on a stump with an open book
  decorRect(ctx, '#8a6239', -12, 14, 24, 16, 2)
  decorEllipse(ctx, '#c49a66', 0, 14, 12, 3.4)
  strokeShape(ctx, '#a57a4c', 0.7, () => {
    ctx.ellipse(0, 14, 7, 1.8, 0, 0, Math.PI * 2)
  })
  decorRect(ctx, '#3d4f6b', -4, 7, 15, 6, 2.5)
  decorRect(ctx, '#3d4f6b', 7, 7, 5, 18, 2)
  decorRect(ctx, '#2a2622', 6, 24, 8, 4, 1.4)
  decorRect(ctx, '#c76a5a', -6, -10, 12, 19, 4)
  decorFace(ctx, 1, -15, 5.4, '#e3b994')
  fillShape(ctx, '#3b2a1e', () => {
    ctx.arc(0.2, -16, 5.8, Math.PI * 0.85, Math.PI * 1.95)
    ctx.quadraticCurveTo(-4, -13, -6, -8)
    ctx.closePath()
  })
  // Book
  decorPoly(ctx, '#f4efe1', [
    [3, -2],
    [9, -5],
    [15, -2],
    [15, 1],
    [9, -2],
    [3, 1],
  ])
  decorPoly(ctx, '#2f6f9a', [
    [3, 1],
    [9, -2],
    [15, 1],
    [15, 2],
    [9, -1],
    [3, 2],
  ])
  strokeShape(ctx, '#b65e4f', 2.6, () => {
    ctx.moveTo(2, -4)
    ctx.lineTo(6, 0)
  })
}

function drawFisher(ctx: Ctx): void {
  // Sitting on a rock with a rod over the water
  decorEllipse(ctx, '#8d877a', -2, 25, 15, 6)
  decorEllipse(ctx, '#a39d90', -4, 23, 11, 4)
  strokeShape(ctx, '#3a2f26', 1.2, () => {
    ctx.moveTo(4, 4)
    ctx.quadraticCurveTo(18, -16, 34, -12)
  })
  strokeShape(ctx, '#d9dcd6', 0.5, () => {
    ctx.moveTo(34, -12)
    ctx.lineTo(34, 18)
  })
  decorEllipse(ctx, '#d94a3a', 34, 18, 1.4, 1.8)
  decorRect(ctx, '#55606b', -6, 13, 15, 6, 2.5)
  decorRect(ctx, '#55606b', 4, 13, 5, 13, 2)
  decorRect(ctx, '#2a2622', 3, 25, 8, 4, 1.4)
  decorRect(ctx, '#4f7a8a', -8, -4, 12, 19, 4)
  strokeShape(ctx, '#45707e', 3, () => {
    ctx.moveTo(1, 2)
    ctx.lineTo(5, 5)
  })
  decorFace(ctx, -1, -9, 5.4, '#dcae86')
  // Straw hat
  decorEllipse(ctx, '#d9b56a', -1, -13, 11, 2.6)
  fillShape(ctx, '#e2c27c', () => {
    ctx.moveTo(-6, -13)
    ctx.quadraticCurveTo(-1, -22, 4, -13)
    ctx.closePath()
  })
  decorRect(ctx, '#9c3b2c', -5.6, -14.4, 9.6, 1.4, 0.5)
}

export const PEOPLE_SPRITES = {
  deco_raincoat_kid: drawRaincoatKid,
  deco_hiker: drawHiker,
  deco_reader: drawReader,
  deco_fisher: drawFisher,
}
