import { fillShape, strokeShape, type Ctx } from '../fauna'

// Epipedobates anthonyi: dark red-brown with cream stripes, round toe pads
export function drawFaunaDartFrog(ctx: Ctx): void {
  const red = '#8e2a1c',
    shade = '#5e180f',
    cream = '#f4e2b8'
  fillShape(ctx, shade, () => ctx.ellipse(-8, 8, 8.5, 5.4, -0.3, 0, Math.PI * 2))
  strokeShape(ctx, shade, 2.2, () => {
    ctx.moveTo(-4, 11.5)
    ctx.quadraticCurveTo(-10, 13.6, -14, 13.6)
  })
  ;[
    [-16, 13.6],
    [-13.6, 14.6],
  ].forEach(([x, y]) => fillShape(ctx, '#d9b98a', () => ctx.arc(x, y, 1.4, 0, Math.PI * 2)))
  const body = () => {
    ctx.moveTo(-14, 8)
    ctx.bezierCurveTo(-15, -2, -3, -7.5, 7, -6.5)
    ctx.bezierCurveTo(15, -6, 18.5, -1, 17.5, 3)
    ctx.bezierCurveTo(16.5, 8, 7, 10.5, -2, 10.5)
    ctx.bezierCurveTo(-9, 10.5, -13.5, 10, -14, 8)
  }
  fillShape(ctx, red, body)
  ctx.save()
  ctx.beginPath()
  body()
  ctx.clip()
  // Cream stripes: along the back edge, the flank, and the lip
  strokeShape(ctx, cream, 2.1, () => {
    ctx.moveTo(-13, 1)
    ctx.bezierCurveTo(-6, -5, 4, -6.2, 15, -2.5)
  })
  strokeShape(ctx, cream, 1.8, () => {
    ctx.moveTo(-12, 6.5)
    ctx.bezierCurveTo(-5, 3, 4, 2.4, 10, 3.8)
  })
  strokeShape(ctx, cream, 1.1, () => {
    ctx.moveTo(9, 6)
    ctx.quadraticCurveTo(14, 5.5, 17.5, 3)
  })
  fillShape(ctx, '#2a0e09', () => ctx.ellipse(-2, 10.5, 14, 2.4, 0, 0, Math.PI * 2))
  ctx.restore()
  strokeShape(ctx, shade, 2.6, () => {
    ctx.moveTo(7, 5)
    ctx.quadraticCurveTo(10.5, 8.5, 9.5, 13)
  })
  ;[
    [7.5, 14.2],
    [10, 14.8],
    [12.5, 14.2],
  ].forEach(([x, y]) => fillShape(ctx, '#d9b98a', () => ctx.arc(x, y, 1.5, 0, Math.PI * 2)))
  fillShape(ctx, '#0d0d0f', () => ctx.arc(10.5, -4.5, 4.2, 0, Math.PI * 2))
  fillShape(ctx, '#fff', () => ctx.arc(9.3, -5.9, 1, 0, Math.PI * 2))
  fillShape(ctx, '#2a0e09', () => ctx.arc(16.5, -0.5, 0.6, 0, Math.PI * 2))
}

// Lepidodactylus lugubris: seen from above, as on the glass; chevrons down the back
export function drawFaunaMourningGecko(ctx: Ctx): void {
  const skin = '#c2b192',
    shade = '#8f7d60',
    dark = '#5b4a36'
  const leg = (x: number, y: number, dx: number, dy: number) => {
    strokeShape(ctx, shade, 2.2, () => {
      ctx.moveTo(x, y)
      ctx.quadraticCurveTo(x + dx * 0.4, y + dy, x + dx, y + dy * 1.3)
    })
    ;[-0.6, 0, 0.6].forEach((a) =>
      fillShape(ctx, '#d8c9aa', () =>
        ctx.ellipse(
          x + dx + Math.sin(a) * 2.4,
          y + dy * 1.3 + Math.sign(dy) * Math.cos(a) * 1.8,
          1.3,
          1,
          0,
          0,
          Math.PI * 2,
        ),
      ),
    )
  }
  leg(9, -2, 4, -4.5)
  leg(9, 2, 4, 4.5)
  leg(-6, -2, -4, -4.5)
  leg(-6, 2, -4, 4.5)
  // Tail curling away
  fillShape(ctx, skin, () => {
    ctx.moveTo(-9, -2.2)
    ctx.bezierCurveTo(-18, -2, -24, 3, -29, 2)
    ctx.quadraticCurveTo(-24, 5.5, -9, 2.2)
    ctx.closePath()
  })
  ;[-14, -19, -23.5].forEach((x) =>
    fillShape(ctx, dark, () => ctx.ellipse(x, x * -0.05 + 1.2, 0.9, 1.4, 0, 0, Math.PI * 2)),
  )
  // Body and head
  fillShape(ctx, skin, () => ctx.ellipse(1, 0, 11, 4.6, 0, 0, Math.PI * 2))
  fillShape(ctx, skin, () => {
    ctx.moveTo(10, -3.4)
    ctx.bezierCurveTo(16, -4.6, 21, -2.6, 22, 0)
    ctx.bezierCurveTo(21, 2.6, 16, 4.6, 10, 3.4)
    ctx.closePath()
  })
  // Dark chevrons pointing toward the head
  ;[-6, -2, 2, 6].forEach((x) =>
    strokeShape(ctx, dark, 1.2, () => {
      ctx.moveTo(x - 1.5, -2.8)
      ctx.lineTo(x + 1.2, 0)
      ctx.lineTo(x - 1.5, 2.8)
    }),
  )
  strokeShape(ctx, 'rgba(255, 247, 228, 0.55)', 1, () => {
    ctx.moveTo(-8, 0)
    ctx.lineTo(9, 0)
  })
  // Bulging eyes at the sides of the head
  ;[-1, 1].forEach((s) => {
    fillShape(ctx, '#7a6a4c', () => ctx.arc(16.5, s * 3.1, 2.1, 0, Math.PI * 2))
    fillShape(ctx, '#1d1a14', () => ctx.ellipse(16.7, s * 3.3, 0.5, 1.4, 0, 0, Math.PI * 2))
  })
}
