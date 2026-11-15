import { fillShape, strokeShape, type Ctx } from '../fauna'

// Anadenobolus monilicornis: glossy black rings, each with a thin yellow band
function millipedeRing(ctx: Ctx, x: number, y: number, r: number): void {
  fillShape(ctx, '#15161a', () => ctx.arc(x, y, r, 0, Math.PI * 2))
  strokeShape(ctx, '#f2c230', r * 0.34, () =>
    ctx.arc(x, y, r * 0.83, Math.PI * 1.05, Math.PI * 1.95),
  )
  fillShape(ctx, 'rgba(255,255,255,0.32)', () =>
    ctx.ellipse(x - r * 0.25, y - r * 0.45, r * 0.4, r * 0.18, -0.3, 0, Math.PI * 2),
  )
}
export function drawFaunaMillipede(ctx: Ctx): void {
  const n = 15
  const pts: [number, number, number][] = []
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    pts.push([-26 + t * 50, 8.5 - Math.sin(t * Math.PI) * 6, 3.9 - Math.abs(t - 0.55) * 1.4])
  }
  pts.forEach(([x, y], i) => {
    if (i === n - 1 || i === 0) return
    strokeShape(ctx, '#4a3a22', 0.75, () => {
      ctx.moveTo(x - 0.6, y + 2.5)
      ctx.quadraticCurveTo(x - 1.6, y + 6, x - 0.6, 14)
      ctx.moveTo(x + 1, y + 2.5)
      ctx.quadraticCurveTo(x + 2, y + 6, x + 1.4, 14)
    })
  })
  pts.forEach(([x, y, r], i) => {
    if (i < n - 1) millipedeRing(ctx, x, y, r)
  })
  const [hx, hy] = pts[n - 1]
  fillShape(ctx, '#202127', () => ctx.ellipse(hx + 1, hy + 0.5, 3.6, 3.1, 0.2, 0, Math.PI * 2))
  strokeShape(ctx, '#2b2c33', 0.9, () => {
    ctx.moveTo(hx + 3, hy - 1.5)
    ctx.quadraticCurveTo(hx + 7, hy - 6, hx + 9, hy - 5)
    ctx.moveTo(hx + 3.5, hy)
    ctx.quadraticCurveTo(hx + 8, hy - 2, hx + 10, hy + 0.5)
  })
  fillShape(ctx, '#f2c230', () => ctx.arc(hx + 2.6, hy - 0.6, 0.7, 0, Math.PI * 2))
}
export function drawFaunaMillipedeCurled(ctx: Ctx): void {
  // A flat spiral, head tucked in the middle: segments spaced evenly along the coil
  const segs: [number, number, number][] = []
  let a = 1.4
  while (segs.length < 22) {
    const r = 2.2 + 1.55 * a
    segs.push([Math.cos(a) * r, 4 + Math.sin(a) * r * 0.82, 2.3 + Math.min(1.4, a * 0.22)])
    a += 3.3 / r
  }
  for (let i = segs.length - 1; i >= 0; i--) millipedeRing(ctx, ...segs[i])
  fillShape(ctx, '#202127', () =>
    ctx.arc(segs[0][0] * 0.4, segs[0][1] * 0.9 + 0.5, 2.4, 0, Math.PI * 2),
  )
}
