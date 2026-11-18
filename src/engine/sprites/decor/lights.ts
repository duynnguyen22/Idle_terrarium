import { fillShape, strokeShape, type Ctx } from '../fauna'
import { decorEllipse, decorRect, decorShine } from './shapes'

function drawMushrooms(ctx: Ctx): void {
  const shroom = (x: number, h: number, w: number, tilt: number) => {
    ctx.save()
    ctx.translate(x, 30)
    ctx.rotate(tilt)
    fillShape(ctx, '#f1ead8', () => {
      ctx.moveTo(-w * 0.22, 0)
      ctx.quadraticCurveTo(-w * 0.16, -h * 0.6, -w * 0.12, -h)
      ctx.lineTo(w * 0.12, -h)
      ctx.quadraticCurveTo(w * 0.16, -h * 0.6, w * 0.22, 0)
      ctx.closePath()
    })
    decorEllipse(ctx, '#e4dac2', 0, -h * 0.55, w * 0.2, w * 0.06)
    fillShape(ctx, '#c7372b', () => {
      ctx.moveTo(-w * 0.5, -h + 1)
      ctx.quadraticCurveTo(-w * 0.48, -h - w * 0.55, 0, -h - w * 0.58)
      ctx.quadraticCurveTo(w * 0.48, -h - w * 0.55, w * 0.5, -h + 1)
      ctx.quadraticCurveTo(0, -h + w * 0.08, -w * 0.5, -h + 1)
      ctx.closePath()
    })
    ;[
      [-0.26, 0.26, 0.07],
      [0.08, 0.42, 0.08],
      [0.3, 0.2, 0.06],
      [-0.05, 0.16, 0.05],
    ].forEach(([sx, sy, r]) =>
      decorEllipse(ctx, '#f8f2e4', sx * w, -h - sy * w, r * w, r * w * 0.8),
    )
    ctx.restore()
  }
  shroom(-11, 22, 22, -0.12)
  shroom(12, 16, 17, 0.14)
  shroom(2, 10, 11, 0.04)
}

function drawGlowMushrooms(ctx: Ctx): void {
  const shroom = (x: number, h: number, w: number) => {
    strokeShape(ctx, '#d8f3f1', w * 0.18, () => {
      ctx.moveTo(x, 30)
      ctx.quadraticCurveTo(x - w * 0.15, 30 - h * 0.5, x, 30 - h)
    })
    fillShape(ctx, '#55c7c0', () => {
      ctx.moveTo(x - w * 0.5, 30 - h + 1)
      ctx.quadraticCurveTo(x, 30 - h - w * 0.75, x + w * 0.5, 30 - h + 1)
      ctx.closePath()
    })
    decorEllipse(ctx, '#b4f0e8', x - w * 0.12, 30 - h - w * 0.22, w * 0.15, w * 0.07)
  }
  shroom(-14, 14, 11)
  shroom(-4, 24, 15)
  shroom(8, 18, 12)
  shroom(16, 9, 8)
}

function drawFireflyJar(ctx: Ctx): void {
  // A small corked jar of firefly lights
  fillShape(ctx, 'rgba(214, 236, 232, 0.55)', () => ctx.roundRect(-11, -14, 22, 44, 6))
  ;[
    [-5, 18, 1.6],
    [4, 10, 1.4],
    [-2, 2, 1.7],
    [6, 22, 1.3],
    [-6, -6, 1.3],
    [3, -4, 1.5],
    [0, 14, 1.2],
  ].forEach(([x, y, r]) => {
    decorEllipse(ctx, 'rgba(255, 214, 102, 0.45)', x, y, r * 2.4, r * 2.4)
    decorEllipse(ctx, '#ffe9a6', x, y, r, r)
  })
  strokeShape(ctx, 'rgba(255, 255, 255, 0.75)', 1, () => ctx.roundRect(-11, -14, 22, 44, 6))
  decorShine(ctx, -6, 4, 1.6, 9, 0.45)
  decorRect(ctx, '#b88a57', -7.5, -21, 15, 8, 2)
  strokeShape(ctx, '#8a6239', 0.8, () => {
    ctx.moveTo(-7.5, -17)
    ctx.lineTo(7.5, -17)
  })
  strokeShape(ctx, '#9c7a52', 0.9, () => {
    ctx.moveTo(-9, -12)
    ctx.quadraticCurveTo(0, -9, 9, -12)
  })
}

export const LIGHTS_SPRITES = {
  deco_mushrooms: drawMushrooms,
  deco_glow_mushrooms: drawGlowMushrooms,
  deco_firefly_jar: drawFireflyJar,
}
