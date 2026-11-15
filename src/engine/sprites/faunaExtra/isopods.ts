import { fillShape, strokeShape, type Ctx } from '../fauna'

// Porcellionides pruinosus: slim, flat, tangerine with a powdery bloom
export function drawFaunaPowderIsopod(ctx: Ctx): void {
  const base = '#f2892b',
    seam = '#c9661a',
    edge = '#d9741f'
  ;[-13, -9, -5, -1, 3, 7, 11].forEach((x) =>
    strokeShape(ctx, '#a8521a', 1.1, () => {
      ctx.moveTo(x, 11.5)
      ctx.lineTo(x + 1.6, 14)
    }),
  )
  strokeShape(ctx, edge, 1.4, () => {
    ctx.moveTo(-19, 11)
    ctx.lineTo(-25, 10.5)
    ctx.moveTo(-18.5, 12)
    ctx.lineTo(-24.5, 13.5)
  })
  const dome = () => {
    ctx.moveTo(-20, 12)
    ctx.bezierCurveTo(-19, 0, 14, -1, 18, 10.5)
    ctx.quadraticCurveTo(0, 13.8, -20, 12)
  }
  fillShape(ctx, base, dome)
  ctx.save()
  ctx.beginPath()
  dome()
  ctx.clip()
  fillShape(ctx, '#ffb070', () => ctx.ellipse(-3, 2, 15, 3.4, -0.05, 0, Math.PI * 2))
  for (let i = 0; i < 8; i++) {
    const x = -15 + i * 4.3
    strokeShape(ctx, seam, 0.9, () => {
      ctx.moveTo(x, 13)
      ctx.quadraticCurveTo(x - 2, 6, x + 0.5, -2)
    })
  }
  // Powdery white bloom
  ;[
    [-12, 6],
    [-7, 3.5],
    [-2, 5],
    [3, 3],
    [8, 5.5],
    [-9, 9],
    [5, 8.5],
    [12, 8],
  ].forEach(([x, y]) =>
    fillShape(ctx, 'rgba(255, 248, 238, 0.75)', () => ctx.arc(x, y, 0.8, 0, Math.PI * 2)),
  )
  ctx.restore()
  strokeShape(ctx, seam, 0.8, dome)
  fillShape(ctx, '#d9741f', () => ctx.ellipse(18.6, 10, 3.6, 3, 0, 0, Math.PI * 2))
  fillShape(ctx, '#1a1a1a', () => ctx.arc(19.6, 8.8, 0.85, 0, Math.PI * 2))
  strokeShape(ctx, '#c9661a', 1, () => {
    ctx.moveTo(20.5, 8)
    ctx.quadraticCurveTo(27, 1, 32, 2.5)
    ctx.moveTo(21, 9.5)
    ctx.quadraticCurveTo(28, 6.5, 31, 10)
  })
}

// Trichorhina tomentosa: rice-grain white isopods, half-buried in dark soil
export function drawFaunaDwarfWhite(ctx: Ctx): void {
  fillShape(ctx, '#3b2a1e', () => {
    ctx.moveTo(-26, 14)
    ctx.bezierCurveTo(-18, 4, 16, 3, 26, 14)
    ctx.closePath()
  })
  fillShape(ctx, '#4d3727', () => ctx.ellipse(0, 12.5, 22, 3.2, 0, 0, Math.PI * 2))
  const grain = (x: number, y: number, a: number, s: number) => {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(a)
    ctx.scale(s, s)
    strokeShape(ctx, '#d8d2c4', 0.6, () => {
      ctx.moveTo(5, -0.8)
      ctx.lineTo(8.5, -3.4)
      ctx.moveTo(5, 0)
      ctx.lineTo(9, -0.6)
    })
    fillShape(ctx, '#fbf6ea', () => ctx.ellipse(0, 0, 5.4, 2.5, 0, 0, Math.PI * 2))
    ;[-3, -1, 1, 3].forEach((sx) =>
      strokeShape(ctx, '#e3dccb', 0.5, () => {
        ctx.moveTo(sx, -2.2)
        ctx.lineTo(sx - 0.3, 2.2)
      }),
    )
    fillShape(ctx, 'rgba(255,255,255,0.9)', () => ctx.ellipse(-1, -1, 3, 0.7, 0, 0, Math.PI * 2))
    ctx.restore()
  }
  grain(-11, 8, -0.2, 1.1)
  grain(3, 6.5, 0.12, 1.25)
  grain(14, 9.5, -0.3, 0.95)
  grain(-2, 11.5, 0.25, 0.85)
  // Soil crumbs lying over the bodies so they read as burrowing
  ;[
    [-14, 9.6, 1.6],
    [-8, 10.6, 1.3],
    [5, 8.6, 1.4],
    [0, 9.2, 1],
    [12, 11, 1.5],
    [17, 10.4, 1.1],
    [-4, 13, 1.4],
  ].forEach(([x, y, r]) => fillShape(ctx, '#2b1e15', () => ctx.arc(x, y, r, 0, Math.PI * 2)))
  ;[
    [-19, 11],
    [9, 12.4],
    [21, 12.6],
  ].forEach(([x, y]) => fillShape(ctx, '#6b4c35', () => ctx.arc(x, y, 0.9, 0, Math.PI * 2)))
}
