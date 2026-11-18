import { fillShape, type Ctx } from '../fauna'

/** Every decor sprite stands on y = +30 (design units, 128 across the sprite). */
export function decorEllipse(
  ctx: Ctx,
  col: string,
  x: number,
  y: number,
  rx: number,
  ry: number,
  rot?: number,
) {
  fillShape(ctx, col, () => ctx.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2))
}
export function decorRect(
  ctx: Ctx,
  col: string,
  x: number,
  y: number,
  w: number,
  h: number,
  r?: number | number[],
) {
  fillShape(ctx, col, () => ctx.roundRect(x, y, w, h, r || 0))
}
export function decorPoly(ctx: Ctx, col: string, pts: number[][]) {
  fillShape(ctx, col, () => {
    ctx.moveTo(pts[0][0], pts[0][1])
    pts.slice(1).forEach((p) => ctx.lineTo(p[0], p[1]))
    ctx.closePath()
  })
}
export function decorShine(ctx: Ctx, x: number, y: number, rx: number, ry: number, a?: number) {
  ctx.save()
  ctx.globalAlpha = a || 0.35
  decorEllipse(ctx, '#ffffff', x, y, rx, ry, -0.5)
  ctx.restore()
}
/** A small figure's face, seen in three-quarter view facing right. */
export function decorFace(ctx: Ctx, x: number, y: number, r: number, skin: string) {
  decorEllipse(ctx, skin, x, y, r, r * 1.02)
  decorEllipse(ctx, '#2a211b', x + r * 0.42, y - r * 0.08, r * 0.13, r * 0.17)
  decorEllipse(ctx, '#e8a796', x + r * 0.5, y + r * 0.38, r * 0.2, r * 0.12)
}
