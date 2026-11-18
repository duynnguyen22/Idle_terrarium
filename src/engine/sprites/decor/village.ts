import { fillShape, strokeShape, type Ctx } from '../fauna'
import { decorEllipse, decorRect, decorPoly, decorShine } from './shapes'

function drawCottage(ctx: Ctx): void {
  // Timber cottage with a moss-thatched roof and a lit round window
  decorRect(ctx, '#7c6a55', -22, 26, 44, 4, 1.5)
  decorRect(ctx, '#eadfc6', -19, 0, 38, 27, 1.5)
  strokeShape(ctx, '#8a6a49', 2, () => {
    ctx.moveTo(-19, 9)
    ctx.lineTo(19, 9)
    ctx.moveTo(-6, 0)
    ctx.lineTo(-6, 27)
    ctx.moveTo(-19, 0)
    ctx.lineTo(-6, 9)
  })
  decorRect(ctx, '#6d4428', -15, 12, 9, 15, [4.5, 4.5, 0, 0])
  decorEllipse(ctx, '#c9a35f', -8.4, 20, 0.9, 0.9)
  decorEllipse(ctx, '#5c3a22', 8, 15, 6, 6)
  decorEllipse(ctx, '#ffd98a', 8, 15, 4.4, 4.4)
  strokeShape(ctx, '#5c3a22', 1.1, () => {
    ctx.moveTo(3.6, 15)
    ctx.lineTo(12.4, 15)
    ctx.moveTo(8, 10.6)
    ctx.lineTo(8, 19.4)
  })
  // Chimney behind the roof
  decorRect(ctx, '#8d857a', 9, -24, 7, 14, 1)
  decorRect(ctx, '#6f685e', 8, -26, 9, 3, 1)
  // Thatch, then moss lumps on top of it
  decorPoly(ctx, '#4f7a37', [
    [-27, 3],
    [-2, -27],
    [2, -27],
    [27, 3],
    [22, 5],
    [-22, 5],
  ])
  ;[
    [-17, -6, 7, '#5f8f45'],
    [-6, -16, 7, '#6a9b4c'],
    [5, -15, 7, '#5a8a40'],
    [15, -5, 7, '#6a9b4c'],
    [0, -4, 9, '#4f7a37'],
    [-12, 0, 6, '#5a8a40'],
    [13, 1, 6, '#5a8a40'],
  ].forEach(([x, y, r, c]) =>
    decorEllipse(ctx, c as string, x as number, y as number, r as number, (r as number) * 0.8),
  )
  ctx.save()
  ctx.globalAlpha = 0.5
  ;[
    [-14, -9],
    [-4, -19],
    [7, -18],
    [16, -8],
    [2, -7],
    [-9, -2],
  ].forEach(([x, y]) => decorEllipse(ctx, '#9cc96a', x, y, 2.6, 1.6))
  ctx.restore()
}

function drawWindmill(ctx: Ctx): void {
  // Country windmill: white tower, wooden cap, four lattice sails
  decorRect(ctx, '#8d877a', -15, 26, 30, 4, 1)
  decorPoly(ctx, '#efe8da', [
    [-12, 27],
    [-7, -14],
    [7, -14],
    [12, 27],
  ])
  decorPoly(ctx, '#d8d0bf', [
    [-12, 27],
    [-7, -14],
    [-3, -14],
    [-6, 27],
  ])
  decorRect(ctx, '#6d4428', -3.5, 15, 7, 12, [3.5, 3.5, 0, 0])
  decorRect(ctx, '#5c3a22', -2, 1, 4, 5, 1)
  fillShape(ctx, '#7a4f2c', () => {
    ctx.moveTo(-9, -13)
    ctx.quadraticCurveTo(0, -27, 9, -13)
    ctx.closePath()
  })
  ctx.save()
  ctx.translate(0, -17)
  ;[0.35, 0.35 + Math.PI / 2, 0.35 + Math.PI, 0.35 + Math.PI * 1.5].forEach((a) => {
    ctx.save()
    ctx.rotate(a)
    strokeShape(ctx, '#6e4a28', 1.6, () => {
      ctx.moveTo(0, 0)
      ctx.lineTo(0, -30)
    })
    fillShape(ctx, 'rgba(244, 238, 224, 0.92)', () => ctx.rect(0.8, -29, 7, 21))
    strokeShape(ctx, '#8a6a49', 0.6, () => {
      for (let y = -26; y <= -10; y += 4) {
        ctx.moveTo(0.8, y)
        ctx.lineTo(7.8, y)
      }
      ctx.moveTo(4.3, -29)
      ctx.lineTo(4.3, -8)
    })
    ctx.restore()
  })
  decorEllipse(ctx, '#3a2a20', 0, 0, 2.4, 2.4)
  ctx.restore()
}

function drawWell(ctx: Ctx): void {
  const stone = '#a39d90',
    dark = '#7b766b'
  strokeShape(ctx, '#6e4a28', 3, () => {
    ctx.moveTo(-15, 12)
    ctx.lineTo(-15, -22)
    ctx.moveTo(15, 12)
    ctx.lineTo(15, -22)
  })
  decorPoly(ctx, '#7a4f2c', [
    [-22, -20],
    [0, -36],
    [22, -20],
    [18, -18],
    [-18, -18],
  ])
  decorPoly(ctx, '#94643a', [
    [-18, -20],
    [0, -33],
    [18, -20],
  ])
  strokeShape(ctx, '#5a3e24', 1.6, () => {
    ctx.moveTo(-15, -12)
    ctx.lineTo(15, -12)
  })
  strokeShape(ctx, '#c2b494', 0.8, () => {
    ctx.moveTo(2, -12)
    ctx.lineTo(2, -1)
  })
  decorRect(ctx, '#7a4f2c', -1, -1, 6, 5, 1)
  // Stone ring
  decorRect(ctx, dark, -19, 6, 38, 24, 3)
  decorEllipse(ctx, '#3b3a35', 0, 6, 19, 5)
  decorEllipse(ctx, '#2a3a40', 0, 6.6, 15.5, 3.4)
  ;[
    [-14, 13],
    [-3, 12],
    [8, 13],
    [-9, 20],
    [3, 20],
    [14, 21],
    [-15, 26],
    [-3, 27],
    [9, 27],
  ].forEach(([x, y], i) => decorRect(ctx, i % 2 ? stone : '#b5afa2', x - 5, y - 3, 10, 5.4, 1.6))
}

function drawMailbox(ctx: Ctx): void {
  decorRect(ctx, '#7a5634', -2, 0, 4, 30)
  decorRect(ctx, '#5a3e24', -6, 27, 12, 3, 1)
  fillShape(ctx, '#c0392b', () => {
    ctx.moveTo(-12, 2)
    ctx.lineTo(-12, -8)
    ctx.arc(0, -8, 12, Math.PI, 0)
    ctx.lineTo(12, 2)
    ctx.closePath()
  })
  fillShape(ctx, '#962c21', () => {
    ctx.moveTo(-12, 2)
    ctx.lineTo(-12, -8)
    ctx.arc(0, -8, 12, Math.PI, Math.PI * 1.25)
    ctx.lineTo(-6, 2)
    ctx.closePath()
  })
  decorRect(ctx, '#7f241b', -12, 1, 24, 2.4, 0.8)
  decorRect(ctx, '#3a2a20', -7, -9, 9, 1.8, 0.8)
  // Flag up: there is mail
  decorRect(ctx, '#3a3f3a', 12, -16, 1.6, 12)
  decorRect(ctx, '#f2c94c', 13.6, -16, 6, 4, 0.6)
  decorShine(ctx, -5, -13, 4, 2, 0.3)
}

function drawBench(ctx: Ctx): void {
  const iron = '#2f3532',
    wood = '#9a6a3c',
    dark = '#6f4a28'
  strokeShape(ctx, iron, 2.4, () => {
    ctx.moveTo(-19, 30)
    ctx.lineTo(-17, 15)
    ctx.moveTo(19, 30)
    ctx.lineTo(17, 15)
    ctx.moveTo(-17, 15)
    ctx.lineTo(-18, -2)
    ctx.moveTo(17, 15)
    ctx.lineTo(18, -2)
  })
  strokeShape(ctx, iron, 1.8, () => {
    ctx.moveTo(-21, 7)
    ctx.quadraticCurveTo(-24, 9, -21, 12)
    ctx.moveTo(21, 7)
    ctx.quadraticCurveTo(24, 9, 21, 12)
  })
  ;[
    [0, '#a8743f'],
    [5, wood],
  ].forEach(([y, c]) => decorRect(ctx, c as string, -24, (y as number) - 1, 48, 3.6, 1.2))
  decorRect(ctx, '#b07c45', -25, 13, 50, 4, 1.4)
  decorRect(ctx, dark, -25, 16.4, 50, 1.4, 0.6)
}

export const VILLAGE_SPRITES = {
  deco_cottage: drawCottage,
  deco_windmill: drawWindmill,
  deco_well: drawWell,
  deco_mailbox: drawMailbox,
  deco_bench: drawBench,
}
