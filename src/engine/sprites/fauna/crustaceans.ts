import { fillShape, strokeShape, type Ctx } from './shapes'

export function drawFaunaVampireCrab(ctx: Ctx) {
  const purple = '#5f3dc4',
    deep = '#3b2580',
    light = '#8f6ff0',
    claw = '#e8590c',
    clawDark = '#b8410a'
  // Walking legs
  ;[
    [-1, 1],
    [1, 1],
  ].forEach(([side]) => {
    ;[0, 1, 2].forEach((i) => {
      const x0 = side * (8 + i * 2.6),
        y0 = 4 + i * 1.4
      strokeShape(ctx, deep, 1.7, () => {
        ctx.moveTo(x0, y0)
        ctx.lineTo(side * (15 + i * 4), y0 - 3 + i)
        ctx.lineTo(side * (18 + i * 5), 14)
      })
    })
  })
  // Claws
  ;[-1, 1].forEach((side) => {
    strokeShape(ctx, clawDark, 3.2, () => {
      ctx.moveTo(side * 10, 2)
      ctx.quadraticCurveTo(side * 16, -1, side * 18, -4)
    })
    fillShape(ctx, claw, () => ctx.ellipse(side * 20, -6, 5.6, 4.2, side * -0.5, 0, Math.PI * 2))
    fillShape(ctx, '#ffc078', () =>
      ctx.ellipse(side * 18.6, -7.6, 1.8, 1.1, side * -0.5, 0, Math.PI * 2),
    )
    fillShape(ctx, clawDark, () => {
      ctx.moveTo(side * 22, -6)
      ctx.lineTo(side * 27, -10.5)
      ctx.lineTo(side * 25.5, -5.5)
    })
    fillShape(ctx, '#f5f0ff', () => {
      ctx.moveTo(side * 21.5, -9)
      ctx.lineTo(side * 26.5, -11.5)
      ctx.lineTo(side * 23, -8)
    })
  })
  // Carapace
  const shell = () => {
    ctx.moveTo(-13, -1)
    ctx.quadraticCurveTo(-12, -9, 0, -9.5)
    ctx.quadraticCurveTo(12, -9, 13, -1)
    ctx.quadraticCurveTo(12, 7, 0, 8)
    ctx.quadraticCurveTo(-12, 7, -13, -1)
  }
  fillShape(ctx, purple, shell)
  ctx.save()
  ctx.beginPath()
  shell()
  ctx.clip()
  fillShape(ctx, deep, () => ctx.ellipse(0, 9, 16, 6, 0, 0, Math.PI * 2))
  fillShape(ctx, light, () => ctx.ellipse(-4, -6.5, 7, 2.6, -0.15, 0, Math.PI * 2))
  ctx.restore()
  // Golden eyes on short stalks
  ;[-1, 1].forEach((side) => {
    strokeShape(ctx, deep, 2, () => {
      ctx.moveTo(side * 4, -8)
      ctx.lineTo(side * 5.5, -11)
    })
    fillShape(ctx, '#fcc419', () => ctx.arc(side * 5.8, -12, 2.9, 0, Math.PI * 2))
    fillShape(ctx, '#1a1033', () => ctx.arc(side * 5.8, -11.8, 1.3, 0, Math.PI * 2))
    fillShape(ctx, '#fff9db', () => ctx.arc(side * 5, -13, 0.7, 0, Math.PI * 2))
  })
}

export function drawFaunaCherryShrimp(ctx: Ctx) {
  const red = '#e8383d',
    deep = '#b42328',
    light = '#ff8a8f'
  // Antennae
  strokeShape(ctx, deep, 0.7, () => {
    ctx.moveTo(13, -4)
    ctx.bezierCurveTo(20, -14, 28, -15, 33, -10)
  })
  strokeShape(ctx, deep, 0.7, () => {
    ctx.moveTo(13, -3)
    ctx.bezierCurveTo(22, -6, 29, 0, 31, 7)
  })
  // Walking legs and swimmerets
  ;[2, 5, 8, 11].forEach((x) =>
    strokeShape(ctx, deep, 1, () => {
      ctx.moveTo(x, 2)
      ctx.quadraticCurveTo(x + 1.5, 8, x + 0.5, 13.5)
    }),
  )
  ;[-4, -8, -11].forEach((x) =>
    strokeShape(ctx, light, 1, () => {
      ctx.moveTo(x, 3)
      ctx.lineTo(x + 1, 7)
    }),
  )
  // Abdomen segments curling down to the tail fan
  const segs = [
    [-3, -1.2, 5.2],
    [-7.6, 0, 4.8],
    [-11.4, 2.4, 4.2],
    [-14, 5.8, 3.6],
    [-15, 9.6, 3],
  ]
  ;[...segs]
    .reverse()
    .forEach(([x, y, r], i) =>
      fillShape(ctx, i % 2 ? red : '#d92f35', () =>
        ctx.ellipse(x, y, r * 1.05, r, 0.4, 0, Math.PI * 2),
      ),
    )
  ;[
    [-15, 13.2, -0.3],
    [-13.2, 13.6, 0.4],
    [-16.6, 12.4, -0.9],
  ].forEach(([x, y, a]) =>
    fillShape(ctx, deep, () => ctx.ellipse(x, y, 3.2, 1.3, a, 0, Math.PI * 2)),
  )
  // Carapace and rostrum
  fillShape(ctx, red, () => ctx.ellipse(6, -1.5, 9.5, 5.6, -0.08, 0, Math.PI * 2))
  fillShape(ctx, red, () => {
    ctx.moveTo(13, -4.5)
    ctx.lineTo(22, -6.5)
    ctx.lineTo(13.5, -2)
    ctx.closePath()
  })
  // Translucent back highlight and saddle
  strokeShape(ctx, light, 1.4, () => {
    ctx.moveTo(-14, 1.5)
    ctx.quadraticCurveTo(-9, -5.5, 0, -5.8)
    ctx.quadraticCurveTo(7, -7, 12, -5.5)
  })
  fillShape(ctx, '#ffd43b', () => ctx.ellipse(2, -0.5, 2.6, 1.6, 0, 0, Math.PI * 2))
  // Eye on a short stalk
  strokeShape(ctx, deep, 1.6, () => {
    ctx.moveTo(12, -3.5)
    ctx.lineTo(14.5, -5.5)
  })
  fillShape(ctx, '#111', () => ctx.arc(14.8, -5.8, 1.7, 0, Math.PI * 2))
  fillShape(ctx, '#fff', () => ctx.arc(14.3, -6.4, 0.5, 0, Math.PI * 2))
}

export function drawFaunaIsopod(ctx: Ctx, variant: 'dairy' | 'ducky') {
  const ducky = variant === 'ducky'
  const base = ducky ? '#3d4248' : '#f4f5f2'
  const seam = ducky ? '#5f666e' : '#c9cec4'
  const edge = ducky ? '#7d858d' : '#aab1a5'
  // Legs and tail prongs
  ;[-12, -8, -4, 0, 4, 8, 12].forEach((x) =>
    strokeShape(ctx, ducky ? '#2b2f33' : '#6b7280', 1.1, () => {
      ctx.moveTo(x, 11)
      ctx.lineTo(x + 1.2, 14)
    }),
  )
  strokeShape(ctx, edge, 1.3, () => {
    ctx.moveTo(-18, 11)
    ctx.lineTo(-23, 12.5)
    ctx.moveTo(-17, 12)
    ctx.lineTo(-21.5, 14)
  })
  // Segmented dome
  const dome = () => {
    ctx.moveTo(-19, 11.5)
    ctx.bezierCurveTo(-19, -5, 15, -6, 17.5, 9.5)
    ctx.quadraticCurveTo(0, 13.5, -19, 11.5)
  }
  fillShape(ctx, base, dome)
  ctx.save()
  ctx.beginPath()
  dome()
  ctx.clip()
  if (!ducky) {
    ;[
      [-11, 3, 4.6, 3.6],
      [1, -1.2, 5.2, 3.8],
      [11, 4.5, 3.2, 3.4],
      [-4, 8, 2.8, 2],
      [7, 9.5, 2.2, 1.6],
    ].forEach(([x, y, rx, ry]) =>
      fillShape(ctx, '#1f2326', () => ctx.ellipse(x, y, rx, ry, 0.3, 0, Math.PI * 2)),
    )
  } else {
    fillShape(ctx, '#565d65', () => ctx.ellipse(-2, -3, 16, 4.5, 0, 0, Math.PI * 2))
  }
  for (let i = 0; i < 7; i++) {
    const x = -14 + i * 4.6
    strokeShape(ctx, seam, 1, () => {
      ctx.moveTo(x, 13)
      ctx.quadraticCurveTo(x - 2.5, 2, x + 0.5, -8)
    })
  }
  fillShape(ctx, edge, () => ctx.ellipse(0, 12.5, 22, 2.4, 0, 0, Math.PI * 2))
  fillShape(ctx, ducky ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.9)', () =>
    ctx.ellipse(-5, -2.5, 7, 1.6, -0.15, 0, Math.PI * 2),
  )
  ctx.restore()
  strokeShape(ctx, edge, 0.9, dome)
  // Head
  if (ducky) {
    fillShape(ctx, '#fcc419', () => ctx.ellipse(18, 8, 5.6, 4.6, 0, 0, Math.PI * 2))
    fillShape(ctx, '#f08c00', () => ctx.ellipse(22.6, 10.2, 3.3, 2, 0.15, 0, Math.PI * 2))
    fillShape(ctx, '#1a1a1a', () => ctx.arc(19.2, 6.4, 1, 0, Math.PI * 2))
    strokeShape(ctx, '#3d4248', 1.1, () => {
      ctx.moveTo(19, 4)
      ctx.quadraticCurveTo(24, -3, 29, -2)
    })
  } else {
    fillShape(ctx, '#9aa293', () => ctx.ellipse(18, 9, 4.2, 3.6, 0, 0, Math.PI * 2))
    fillShape(ctx, '#1a1a1a', () => ctx.arc(19.4, 7.6, 0.9, 0, Math.PI * 2))
    strokeShape(ctx, '#6b7280', 1, () => {
      ctx.moveTo(20, 6.5)
      ctx.quadraticCurveTo(25, -1, 30, 0)
      ctx.moveTo(20.5, 8)
      ctx.quadraticCurveTo(26, 5, 29, 8)
    })
  }
}
