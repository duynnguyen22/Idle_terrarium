import { fillShape, strokeShape, type Ctx, type DrawFn } from './fauna'

/* New fauna from the paludarium fauna research (prototype v8). */

// Porcellionides pruinosus: slim, flat, tangerine with a powdery bloom
function drawFaunaPowderIsopod(ctx: Ctx): void {
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
function drawFaunaDwarfWhite(ctx: Ctx): void {
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
function drawFaunaMillipede(ctx: Ctx): void {
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
function drawFaunaMillipedeCurled(ctx: Ctx): void {
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

// Epipedobates anthonyi: dark red-brown with cream stripes, round toe pads
function drawFaunaDartFrog(ctx: Ctx): void {
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
function drawFaunaMourningGecko(ctx: Ctx): void {
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

// Nerite snail: olive-gold half-dome with black zigzag stripes
function drawFaunaNerite(ctx: Ctx): void {
  fillShape(ctx, '#8f8a7e', () => {
    ctx.moveTo(-15, 14)
    ctx.quadraticCurveTo(-12, 10, 0, 10)
    ctx.lineTo(13, 10.5)
    ctx.quadraticCurveTo(19, 11, 18, 14)
    ctx.closePath()
  })
  strokeShape(ctx, '#8f8a7e', 1.1, () => {
    ctx.moveTo(14, 11)
    ctx.quadraticCurveTo(19, 8, 23, 9)
    ctx.moveTo(14.5, 12)
    ctx.quadraticCurveTo(20, 11.5, 23.5, 13)
  })
  fillShape(ctx, '#1b1b18', () => ctx.arc(15, 10.6, 0.7, 0, Math.PI * 2))
  const shell = () => {
    ctx.moveTo(-15, 11)
    ctx.bezierCurveTo(-16, -6, 13, -8, 15, 10.5)
    ctx.quadraticCurveTo(0, 13, -15, 11)
  }
  fillShape(ctx, '#b8962e', shell)
  ctx.save()
  ctx.beginPath()
  shell()
  ctx.clip()
  for (let i = -4; i < 6; i++) {
    strokeShape(ctx, '#20190c', 1.7, () => {
      const x0 = i * 4.2 - 2
      ctx.moveTo(x0, -8)
      for (let k = 1; k <= 6; k++) ctx.lineTo(x0 + (k % 2 ? 2.4 : -0.6) + k * 0.9, -8 + k * 3.6)
    })
  }
  fillShape(ctx, 'rgba(70, 52, 14, 0.35)', () => ctx.ellipse(0, 12, 18, 4, 0, 0, Math.PI * 2))
  fillShape(ctx, 'rgba(255, 244, 200, 0.45)', () =>
    ctx.ellipse(-4, -2, 6, 2.2, -0.4, 0, Math.PI * 2),
  )
  ctx.restore()
  strokeShape(ctx, '#7c6420', 0.9, shell)
}

// Planorbella duryi: flat pink spiral seen face-on, red body below
function drawFaunaRamshorn(ctx: Ctx): void {
  fillShape(ctx, '#d62f3c', () => {
    ctx.moveTo(-10, 14)
    ctx.quadraticCurveTo(-6, 9.5, 4, 9.5)
    ctx.quadraticCurveTo(12, 9.8, 14, 14)
    ctx.closePath()
  })
  strokeShape(ctx, '#d62f3c', 1, () => {
    ctx.moveTo(10, 11)
    ctx.quadraticCurveTo(16, 5, 21, 4)
    ctx.moveTo(11, 12)
    ctx.quadraticCurveTo(18, 9, 22, 10)
  })
  fillShape(ctx, '#f4a3b6', () => ctx.arc(0, 1, 11.5, 0, Math.PI * 2))
  fillShape(ctx, '#e88aa1', () => ctx.arc(0.6, 1.6, 9.5, 0, Math.PI * 2))
  strokeShape(ctx, '#c86a83', 1.1, () => {
    let first = true
    for (let t = 0; t < Math.PI * 6; t += 0.18) {
      const r = 10.6 - t * 0.52
      if (r < 0.8) break
      const x = Math.cos(t + Math.PI) * r + 0.3,
        y = Math.sin(t + Math.PI) * r + 1.3
      if (first) {
        ctx.moveTo(x, y)
        first = false
      } else ctx.lineTo(x, y)
    }
  })
  fillShape(ctx, 'rgba(255, 238, 243, 0.7)', () =>
    ctx.ellipse(-4, -5, 4.6, 1.6, -0.5, 0, Math.PI * 2),
  )
  strokeShape(ctx, '#b65674', 0.8, () => ctx.arc(0, 1, 11.5, 0, Math.PI * 2))
}

// Caridina multidentata: glassy, twice a cherry shrimp, with a row of brown dashes
function drawFaunaAmano(ctx: Ctx): void {
  const glass = 'rgba(205, 214, 214, 0.78)',
    deep = '#8c9696',
    dash = '#8a4a2c'
  strokeShape(ctx, deep, 0.6, () => {
    ctx.moveTo(15, -4)
    ctx.bezierCurveTo(24, -16, 32, -16, 36, -10)
  })
  strokeShape(ctx, deep, 0.6, () => {
    ctx.moveTo(15, -3)
    ctx.bezierCurveTo(25, -6, 32, 1, 33, 8)
  })
  ;[2, 5.5, 9, 12.5].forEach((x) =>
    strokeShape(ctx, deep, 0.9, () => {
      ctx.moveTo(x, 2.5)
      ctx.quadraticCurveTo(x + 1.5, 8.5, x + 0.5, 14)
    }),
  )
  const segs = [
    [-4, -1.2, 5.8],
    [-9, 0.2, 5.3],
    [-13.4, 2.8, 4.7],
    [-16.6, 6.4, 4],
    [-18, 10.2, 3.3],
  ]
  ;[...segs]
    .reverse()
    .forEach(([x, y, r]) =>
      fillShape(ctx, glass, () => ctx.ellipse(x, y, r * 1.05, r, 0.4, 0, Math.PI * 2)),
    )
  ;[
    [-18, 13.6, -0.3],
    [-16, 14, 0.4],
    [-19.8, 12.8, -0.9],
  ].forEach(([x, y, a]) =>
    fillShape(ctx, '#9aa5a5', () => ctx.ellipse(x, y, 3.4, 1.4, a, 0, Math.PI * 2)),
  )
  fillShape(ctx, glass, () => ctx.ellipse(6, -1.5, 10.5, 6, -0.08, 0, Math.PI * 2))
  fillShape(ctx, glass, () => {
    ctx.moveTo(14, -4.5)
    ctx.lineTo(24, -6.5)
    ctx.lineTo(14.5, -2)
    ctx.closePath()
  })
  // Pale back stripe and the brown dash rows that name the species
  strokeShape(ctx, 'rgba(255, 250, 238, 0.9)', 1.3, () => {
    ctx.moveTo(-17, 1.5)
    ctx.quadraticCurveTo(-11, -6, 0, -6.6)
    ctx.quadraticCurveTo(8, -7.6, 13, -6)
  })
  ;[
    [-15, 5.5],
    [-12.5, 3],
    [-9, 1.6],
    [-5, 0.6],
    [-1, 0.2],
    [3, 0.4],
    [7, 0.8],
    [10.5, 0.4],
  ].forEach(([x, y]) =>
    fillShape(ctx, dash, () => ctx.ellipse(x, y, 1.3, 0.55, 0.15, 0, Math.PI * 2)),
  )
  ;[
    [-11, 6.5],
    [-6.5, 4.6],
    [-1.5, 3.6],
    [3.5, 3.8],
    [8, 3.2],
  ].forEach(([x, y]) => fillShape(ctx, dash, () => ctx.ellipse(x, y, 1, 0.45, 0.1, 0, Math.PI * 2)))
  strokeShape(ctx, deep, 1.5, () => {
    ctx.moveTo(13, -3.5)
    ctx.lineTo(15.5, -5.5)
  })
  fillShape(ctx, '#111', () => ctx.arc(15.8, -5.8, 1.8, 0, Math.PI * 2))
  fillShape(ctx, '#fff', () => ctx.arc(15.2, -6.4, 0.5, 0, Math.PI * 2))
}

/** Sprites of the eight research species, keyed by catalog id. */
export const FAUNA_EXTRA_SPRITES = {
  powder_orange: drawFaunaPowderIsopod,
  dwarf_white: drawFaunaDwarfWhite,
  bumblebee_millipede: drawFaunaMillipede,
  phantasmal_dart: drawFaunaDartFrog,
  mourning_gecko: drawFaunaMourningGecko,
  nerite_snail: drawFaunaNerite,
  ramshorn_snail: drawFaunaRamshorn,
  amano_shrimp: drawFaunaAmano,
} as const satisfies Record<string, DrawFn>

/** The millipede coiled up by day; drawn in place of the walking sprite while it hides. */
export const MILLIPEDE_CURL_SPRITE: DrawFn = drawFaunaMillipedeCurled
