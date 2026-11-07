import type { CatalogId } from '@/data/catalog'

export type DrawFn = (ctx: CanvasRenderingContext2D) => void
type Ctx = CanvasRenderingContext2D

function fillShape(ctx: Ctx, color: string, build: () => void) {
  ctx.fillStyle = color
  ctx.beginPath()
  build()
  ctx.fill()
}
function strokeShape(ctx: Ctx, color: string, width: number, build: () => void) {
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  build()
  ctx.stroke()
}

function drawFaunaTreeFrog(ctx: Ctx) {
  const green = '#3fb950',
    shade = '#2b8a3e',
    light = '#8ce99a',
    orange = '#f76707',
    blue = '#1c64c4'
  // Back leg, folded under the body
  fillShape(ctx, shade, () => ctx.ellipse(-11, 7, 11, 6.5, -0.35, 0, Math.PI * 2))
  strokeShape(ctx, shade, 2.6, () => {
    ctx.moveTo(-6, 11)
    ctx.quadraticCurveTo(-14, 13, -18, 13)
  })
  ;[
    [-21.5, 13.2],
    [-18.8, 14.4],
    [-15.8, 14.6],
  ].forEach(([x, y]) => fillShape(ctx, orange, () => ctx.arc(x, y, 1.7, 0, Math.PI * 2)))
  // Body
  const body = () => {
    ctx.moveTo(-19, 7)
    ctx.bezierCurveTo(-21, -5, -6, -12, 8, -10.5)
    ctx.bezierCurveTo(19, -9.5, 24, -3, 22.5, 2.5)
    ctx.bezierCurveTo(21, 8.5, 9, 11.5, -3, 11.5)
    ctx.bezierCurveTo(-12, 11.5, -18, 10.5, -19, 7)
  }
  fillShape(ctx, green, body)
  // Cream throat and belly
  fillShape(ctx, '#f3efc7', () => {
    ctx.moveTo(4, 9)
    ctx.bezierCurveTo(10, 5, 19, 4, 22, 3)
    ctx.bezierCurveTo(19, 9, 10, 11.5, 2, 11.2)
  })
  // Blue flank with pale bars
  ctx.save()
  ctx.beginPath()
  body()
  ctx.clip()
  fillShape(ctx, blue, () => {
    ctx.moveTo(-18, 6)
    ctx.bezierCurveTo(-10, 3, 0, 4.5, 6, 7.5)
    ctx.bezierCurveTo(0, 10, -10, 11, -18, 9.5)
  })
  ;[-13, -8, -3].forEach((x) =>
    fillShape(ctx, '#fff3bf', () => ctx.ellipse(x, 7, 0.9, 2.4, 0.25, 0, Math.PI * 2)),
  )
  ctx.restore()
  // Back highlight
  strokeShape(ctx, light, 1.8, () => {
    ctx.moveTo(-12, -4)
    ctx.quadraticCurveTo(-3, -9.5, 7, -9)
  })
  // Front leg and toe pads
  strokeShape(ctx, shade, 3.4, () => {
    ctx.moveTo(9, 6)
    ctx.quadraticCurveTo(13, 9, 12, 13)
  })
  ;[
    [9.5, 14.2],
    [12.5, 14.8],
    [15.5, 14.2],
  ].forEach(([x, y]) => fillShape(ctx, orange, () => ctx.arc(x, y, 1.7, 0, Math.PI * 2)))
  // Mouth line
  strokeShape(ctx, shade, 0.9, () => {
    ctx.moveTo(14, 1.5)
    ctx.quadraticCurveTo(19, 3, 22.5, 2)
  })
  // Red eye with vertical pupil
  fillShape(ctx, shade, () => ctx.arc(13.5, -8.5, 6.6, 0, Math.PI * 2))
  fillShape(ctx, '#e03131', () => ctx.arc(13.5, -8.5, 5.6, 0, Math.PI * 2))
  fillShape(ctx, '#ff8787', () => ctx.arc(12.4, -10, 2.4, 0, Math.PI * 2))
  fillShape(ctx, '#111', () => ctx.ellipse(13.6, -8.4, 1.4, 4, 0, 0, Math.PI * 2))
  fillShape(ctx, '#fff', () => ctx.arc(11.8, -11, 1.1, 0, Math.PI * 2))
  fillShape(ctx, '#1b2a1f', () => ctx.arc(21, -2.5, 0.7, 0, Math.PI * 2))
}

function drawFaunaVampireCrab(ctx: Ctx) {
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

function drawFaunaMedaka(ctx: Ctx) {
  const gold = '#f59f00',
    back = '#d9730b',
    belly = '#ffe08a',
    fin = 'rgba(255, 192, 120, 0.85)'
  // Tail fin with rays
  fillShape(ctx, gold, () => {
    ctx.moveTo(-13, 0)
    ctx.lineTo(-25, -7.5)
    ctx.quadraticCurveTo(-21.5, 0, -25, 7.5)
    ctx.closePath()
  })
  ;[-5, -2, 2, 5].forEach((y) =>
    strokeShape(ctx, '#ffd8a8', 0.7, () => {
      ctx.moveTo(-14, 0)
      ctx.lineTo(-23.5, y * 1.2)
    }),
  )
  // Dorsal fin set far back, long anal fin below
  fillShape(ctx, fin, () => {
    ctx.moveTo(-4, -4.6)
    ctx.lineTo(-9, -9.5)
    ctx.lineTo(-12.5, -3)
    ctx.closePath()
  })
  fillShape(ctx, fin, () => {
    ctx.moveTo(0, 4.6)
    ctx.lineTo(-11, 3)
    ctx.lineTo(-10.5, 6.5)
    ctx.lineTo(-1.5, 6.6)
    ctx.closePath()
  })
  // Body
  const body = () => {
    ctx.moveTo(17.5, 0)
    ctx.bezierCurveTo(13, -6.5, -4, -7, -13.5, -2)
    ctx.quadraticCurveTo(-15, 0, -13.5, 2)
    ctx.bezierCurveTo(-4, 6.5, 13, 6, 17.5, 0)
  }
  fillShape(ctx, gold, body)
  ctx.save()
  ctx.beginPath()
  body()
  ctx.clip()
  fillShape(ctx, back, () => ctx.ellipse(0, -7, 22, 4, 0, 0, Math.PI * 2))
  fillShape(ctx, belly, () => ctx.ellipse(2, 6, 18, 3.6, 0, 0, Math.PI * 2))
  ctx.restore()
  // Pectoral fin and lateral line
  fillShape(ctx, fin, () => ctx.ellipse(5.5, 2, 3.6, 1.6, 0.5, 0, Math.PI * 2))
  strokeShape(ctx, '#e8590c', 0.7, () => {
    ctx.moveTo(7, -0.5)
    ctx.quadraticCurveTo(-3, 0.5, -12, 0)
  })
  // Large silver eye and upturned mouth
  fillShape(ctx, '#e9ecef', () => ctx.arc(11.5, -1.3, 3.3, 0, Math.PI * 2))
  fillShape(ctx, '#4dabf7', () => ctx.arc(11.7, -1.2, 2.2, 0, Math.PI * 2))
  fillShape(ctx, '#111', () => ctx.arc(11.8, -1.1, 1.5, 0, Math.PI * 2))
  fillShape(ctx, '#fff', () => ctx.arc(11, -2.2, 0.7, 0, Math.PI * 2))
  strokeShape(ctx, '#a34700', 0.8, () => {
    ctx.moveTo(15.8, -1.3)
    ctx.lineTo(17.6, -0.4)
  })
}

function drawFaunaCherryShrimp(ctx: Ctx) {
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

function drawFaunaIsopod(ctx: Ctx, variant: 'dairy' | 'ducky') {
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

function drawFaunaSpringtails(ctx: Ctx) {
  // A decaying leaf as their ground, so the white bodies read on any background
  fillShape(ctx, '#7a4a20', () => {
    ctx.moveTo(-24, 10)
    ctx.bezierCurveTo(-14, 0, 12, 0, 24, 9)
    ctx.bezierCurveTo(12, 16, -14, 17, -24, 10)
  })
  strokeShape(ctx, '#5c3615', 0.9, () => {
    ctx.moveTo(-22, 10)
    ctx.lineTo(22, 9.5)
    ;[-14, -6, 2, 10].forEach((x) => {
      ctx.moveTo(x, 10)
      ctx.lineTo(x + 5, 5.5)
      ctx.moveTo(x, 10)
      ctx.lineTo(x + 5, 14)
    })
  })
  const bug = (x: number, y: number, a: number, s: number) => {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(a)
    ctx.scale(s, s)
    strokeShape(ctx, '#b8bfc6', 0.6, () => {
      ctx.moveTo(4, -0.6)
      ctx.lineTo(8, -3.5)
      ctx.moveTo(4, 0)
      ctx.lineTo(8.5, -0.8)
    })
    strokeShape(ctx, '#b8bfc6', 0.6, () => {
      ctx.moveTo(-3.5, 1.3)
      ctx.lineTo(-1, 3.2)
    })
    fillShape(ctx, '#ffffff', () => ctx.ellipse(-0.5, 0, 4.4, 1.9, 0, 0, Math.PI * 2))
    fillShape(ctx, '#f1f3f5', () => ctx.arc(4, -0.3, 1.5, 0, Math.PI * 2))
    fillShape(ctx, '#1a1a1a', () => ctx.arc(4.6, -0.7, 0.45, 0, Math.PI * 2))
    ctx.restore()
  }
  bug(-13, 7.5, -0.15, 1.15)
  bug(-1, 5, 0.1, 1.3)
  bug(11, 8, -0.25, 1.05)
  bug(3, 11.5, 0.2, 0.9)
  bug(-7, 12, 0.05, 0.8)
}

function drawFaunaSnail(ctx: Ctx) {
  const skin = '#7c858c',
    skinLight = '#a8b0b6'
  // Foot and head
  fillShape(ctx, skin, () => {
    ctx.moveTo(-18, 14)
    ctx.quadraticCurveTo(-14, 10, -2, 10)
    ctx.lineTo(14, 8)
    ctx.bezierCurveTo(19, 3, 23, 6, 22, 11)
    ctx.quadraticCurveTo(21, 14, 16, 14)
    ctx.closePath()
  })
  strokeShape(ctx, skinLight, 1, () => {
    ctx.moveTo(-12, 12.5)
    ctx.lineTo(14, 11.5)
  })
  // Eye stalks with dark tips
  strokeShape(ctx, skin, 1.8, () => {
    ctx.moveTo(18, 5.5)
    ctx.quadraticCurveTo(19.5, -1, 22, -5)
    ctx.moveTo(20, 6)
    ctx.quadraticCurveTo(24, 1, 27, -1.5)
  })
  fillShape(ctx, '#2b3034', () => ctx.arc(22.2, -5.4, 1.3, 0, Math.PI * 2))
  fillShape(ctx, '#2b3034', () => ctx.arc(27.3, -1.8, 1.3, 0, Math.PI * 2))
  strokeShape(ctx, skin, 1.2, () => {
    ctx.moveTo(21.5, 10)
    ctx.lineTo(25, 11.5)
  })
  // Translucent amber shell with a flat spiral
  fillShape(ctx, '#d9480f', () => ctx.ellipse(-3, 1.5, 13.5, 10, -0.12, 0, Math.PI * 2))
  fillShape(ctx, '#f76707', () => ctx.ellipse(-3.5, 0.5, 11.5, 8.4, -0.12, 0, Math.PI * 2))
  fillShape(ctx, '#ffa94d', () => ctx.ellipse(-4.5, -1.5, 7.5, 5.2, -0.12, 0, Math.PI * 2))
  strokeShape(ctx, '#c2410c', 1.3, () => {
    let first = true
    for (let t = 0; t < Math.PI * 5; t += 0.2) {
      const r = 1 + t * 0.62
      const x = -3.5 + Math.cos(t) * r * 1.3
      const y = 0.8 + Math.sin(t) * r * 0.95
      if (first) {
        ctx.moveTo(x, y)
        first = false
      } else ctx.lineTo(x, y)
    }
  })
  strokeShape(ctx, 'rgba(255, 244, 230, 0.85)', 1.6, () => {
    ctx.moveTo(-12, -2)
    ctx.quadraticCurveTo(-9, -8, -2, -8.3)
  })
}

export const FAUNA_SPRITES: Partial<Record<CatalogId, DrawFn>> = {
  tree_frog: drawFaunaTreeFrog,
  vampire_crab: drawFaunaVampireCrab,
  medaka_fish: drawFaunaMedaka,
  cherry_shrimp: drawFaunaCherryShrimp,
  isopod: (ctx) => drawFaunaIsopod(ctx, 'dairy'),
  ducky_isopod: (ctx) => drawFaunaIsopod(ctx, 'ducky'),
  springtails: drawFaunaSpringtails,
  garden_snail: drawFaunaSnail,
}
