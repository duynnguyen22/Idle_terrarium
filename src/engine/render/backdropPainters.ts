import type { BackdropId } from '@/data/types'

/**
 * Procedural miniature landscapes for the back glass (prototype-v7 paintBackdrop). Every scene is
 * drawn from a fixed seed, so the same id and size always paint the same picture.
 */

/** mulberry32, as in the prototype's seededRandom. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Height of a rolling ridge line at `x`: three stacked sines, the finer two scaled by `rough`. */
export function ridgeY(
  x: number,
  w: number,
  base: number,
  amp: number,
  seed: number,
  rough = 1,
): number {
  const u = x / w
  return (
    base -
    amp *
      (0.55 * Math.sin(u * 5.1 + seed) +
        0.3 * Math.sin(u * 11.7 + seed * 2.3) * rough +
        0.15 * Math.sin(u * 23.3 + seed * 4.1) * rough)
  )
}

function fillRidge(
  g: CanvasRenderingContext2D,
  w: number,
  h: number,
  base: number,
  amp: number,
  seed: number,
  color: string,
  rough = 1,
): void {
  g.fillStyle = color
  g.beginPath()
  g.moveTo(0, h)
  for (let x = 0; x <= w + 4; x += 4) g.lineTo(x, ridgeY(x, w, base, amp, seed, rough))
  g.lineTo(w, h)
  g.closePath()
  g.fill()
}

export function skyGradient(
  g: CanvasRenderingContext2D,
  w: number,
  h: number,
  top: string,
  bottom: string,
  stop = 0.75,
): void {
  const gr = g.createLinearGradient(0, 0, 0, h * stop)
  gr.addColorStop(0, top)
  gr.addColorStop(1, bottom)
  g.fillStyle = gr
  g.fillRect(0, 0, w, h)
}

type Rnd = () => number
type Painter = (g: CanvasRenderingContext2D, w: number, h: number, rnd: Rnd) => void

/** Ha Long Bay: three layers of misty limestone towers over a bay with a junk boat. */
const paintKarst: Painter = (g, w, h, rnd) => {
  skyGradient(g, w, h, '#cfe3e6', '#eef2e6')
  // Sun haze
  g.fillStyle = 'rgba(255, 246, 214, 0.55)'
  g.beginPath()
  g.arc(w * 0.72, h * 0.24, h * 0.07, 0, Math.PI * 2)
  g.fill()
  const layers = [
    { col: '#b9cfd2', count: 9, base: 0.62, hmin: 0.18, hmax: 0.3, wmin: 0.05, wmax: 0.09 },
    { col: '#8fb0ae', count: 7, base: 0.68, hmin: 0.22, hmax: 0.36, wmin: 0.06, wmax: 0.11 },
    { col: '#5f8a7c', count: 5, base: 0.74, hmin: 0.26, hmax: 0.42, wmin: 0.08, wmax: 0.13 },
  ]
  layers.forEach((L, li) => {
    for (let i = 0; i < L.count; i++) {
      const tx = ((i + 0.2 + rnd() * 0.6) / L.count) * w
      const tw = (L.wmin + rnd() * (L.wmax - L.wmin)) * w
      const th = (L.hmin + rnd() * (L.hmax - L.hmin)) * h
      const by = L.base * h
      g.fillStyle = L.col
      g.beginPath()
      g.moveTo(tx - tw * 0.62, by)
      g.bezierCurveTo(
        tx - tw * 0.66,
        by - th * 0.55,
        tx - tw * 0.5,
        by - th * 0.95,
        tx - tw * 0.12,
        by - th,
      )
      g.bezierCurveTo(
        tx + tw * 0.2,
        by - th * 1.04,
        tx + tw * 0.48,
        by - th * 0.86,
        tx + tw * 0.56,
        by - th * 0.5,
      )
      g.bezierCurveTo(
        tx + tw * 0.6,
        by - th * 0.25,
        tx + tw * 0.66,
        by - th * 0.08,
        tx + tw * 0.62,
        by,
      )
      g.closePath()
      g.fill()
      if (li === 2) {
        g.fillStyle = 'rgba(62, 104, 76, 0.55)'
        for (let k = 0; k < 7; k++) {
          g.beginPath()
          g.arc(
            tx + (rnd() - 0.5) * tw * 0.8,
            by - th * (0.25 + rnd() * 0.7),
            tw * 0.08,
            0,
            Math.PI * 2,
          )
          g.fill()
        }
      }
    }
    // Mist band between layers
    const mist = g.createLinearGradient(0, L.base * h - h * 0.07, 0, L.base * h)
    mist.addColorStop(0, 'rgba(238, 244, 240, 0)')
    mist.addColorStop(1, 'rgba(238, 244, 240, 0.7)')
    g.fillStyle = mist
    g.fillRect(0, L.base * h - h * 0.07, w, h * 0.07)
  })
  // Bay water with reflections
  g.fillStyle = '#9cc2c4'
  g.fillRect(0, h * 0.74, w, h * 0.26)
  g.strokeStyle = 'rgba(255, 255, 255, 0.45)'
  g.lineWidth = Math.max(1, h * 0.004)
  for (let i = 0; i < 18; i++) {
    const y = h * (0.77 + rnd() * 0.2)
    const x = rnd() * w
    const l = w * (0.02 + rnd() * 0.05)
    g.beginPath()
    g.moveTo(x, y)
    g.lineTo(x + l, y)
    g.stroke()
  }
  // Junk boat with battened sails
  const bx = w * 0.3
  const by = h * 0.775
  const s = h * 0.05
  g.fillStyle = '#4a3428'
  g.beginPath()
  g.moveTo(bx - s, by)
  g.quadraticCurveTo(bx, by + s * 0.45, bx + s * 1.1, by - s * 0.1)
  g.closePath()
  g.fill()
  g.fillStyle = '#b5522f'
  g.beginPath()
  g.moveTo(bx - s * 0.1, by - s * 0.05)
  g.lineTo(bx - s * 0.35, by - s * 1.3)
  g.quadraticCurveTo(bx + s * 0.25, by - s * 1.2, bx + s * 0.5, by - s * 0.05)
  g.closePath()
  g.fill()
  g.strokeStyle = 'rgba(70, 30, 15, 0.6)'
  g.lineWidth = 1
  for (let k = 1; k < 4; k++) {
    g.beginPath()
    g.moveTo(bx - s * 0.12 - k * 0.07 * s, by - s * 0.32 * k)
    g.lineTo(bx + s * 0.45 - k * 0.05 * s, by - s * 0.32 * k + s * 0.05)
    g.stroke()
  }
}

/** Rice terraces: sixteen contour bands under two far ridges, with a stilt house. */
const paintTerraces: Painter = (g, w, h) => {
  skyGradient(g, w, h, '#d9e8ef', '#f1f0e2')
  fillRidge(g, w, h, h * 0.3, h * 0.08, 1.3, '#a9bcc0', 0.6)
  fillRidge(g, w, h, h * 0.4, h * 0.07, 2.9, '#8aa79a', 0.7)
  const cols = ['#9dbb5a', '#b4c96a', '#8fae4c', '#c9cf74', '#a5c25f', '#7fa244']
  for (let i = 0; i < 16; i++) {
    const base = h * (0.46 + i * 0.034)
    const seed = 4.2 + i * 0.37
    g.fillStyle = cols[i % cols.length]
    g.beginPath()
    g.moveTo(0, h)
    for (let x = 0; x <= w + 4; x += 4) g.lineTo(x, ridgeY(x, w, base, h * 0.045, seed, 0.35))
    g.lineTo(w, h)
    g.closePath()
    g.fill()
    g.strokeStyle = 'rgba(92, 112, 46, 0.55)'
    g.lineWidth = Math.max(1, h * 0.003)
    g.beginPath()
    for (let x = 0; x <= w + 4; x += 4) {
      const y = ridgeY(x, w, base, h * 0.045, seed, 0.35)
      if (x === 0) g.moveTo(x, y)
      else g.lineTo(x, y)
    }
    g.stroke()
  }
  // Stilt house
  const hx = w * 0.64
  const hy = ridgeY(w * 0.64, w, h * (0.46 + 3 * 0.034), h * 0.045, 4.2 + 3 * 0.37, 0.35)
  const s = h * 0.035
  g.fillStyle = '#6b4a2f'
  g.fillRect(hx - s, hy - s * 1.1, s * 2, s * 0.9)
  g.fillStyle = '#4b3220'
  g.beginPath()
  g.moveTo(hx - s * 1.4, hy - s * 1.05)
  g.lineTo(hx, hy - s * 2.1)
  g.lineTo(hx + s * 1.4, hy - s * 1.05)
  g.closePath()
  g.fill()
}

/** Misty pines: four ridges of conifers, each with a fog band at its foot. */
const paintPines: Painter = (g, w, h, rnd) => {
  skyGradient(g, w, h, '#d5dde0', '#eef0ea')
  const ridges = [
    { base: 0.4, amp: 0.07, seed: 0.7, col: '#b7c4c4', tree: '#a9b8b8' },
    { base: 0.52, amp: 0.06, seed: 2.2, col: '#8fa3a0', tree: '#7f9592' },
    { base: 0.64, amp: 0.05, seed: 3.9, col: '#5f7b72', tree: '#4f6b62' },
    { base: 0.76, amp: 0.04, seed: 5.3, col: '#3e5a4f', tree: '#2f4a40' },
  ]
  ridges.forEach((r, ri) => {
    fillRidge(g, w, h, h * r.base, h * r.amp, r.seed, r.col, 0.8)
    g.fillStyle = r.tree
    const n = 26 + ri * 8
    const th = h * (0.035 + ri * 0.016)
    for (let i = 0; i < n; i++) {
      const x = ((i + rnd()) / n) * w
      const y = ridgeY(x, w, h * r.base, h * r.amp, r.seed, 0.8) + th * 0.25
      const tw = th * 0.32
      g.beginPath()
      g.moveTo(x, y - th)
      g.lineTo(x + tw, y)
      g.lineTo(x - tw, y)
      g.closePath()
      g.fill()
    }
    const fog = g.createLinearGradient(0, h * (r.base - 0.02), 0, h * (r.base + 0.07))
    fog.addColorStop(0, 'rgba(240, 243, 240, 0)')
    fog.addColorStop(0.6, 'rgba(240, 243, 240, 0.55)')
    fog.addColorStop(1, 'rgba(240, 243, 240, 0)')
    g.fillStyle = fog
    g.fillRect(0, h * (r.base - 0.02), w, h * 0.09)
  })
}

/** Alpine lake: two snow-capped ranges, a wooded shore and the range reflected in the water. */
const paintAlpine: Painter = (g, w, h) => {
  skyGradient(g, w, h, '#a9cbe3', '#e3eef2')
  const peaks = (
    base: number,
    amp: number,
    n: number,
    seed: number,
    col: string,
    snow: boolean,
  ) => {
    const r2 = seededRandom(seed)
    const pts: [number, number][] = []
    for (let i = 0; i <= n; i++) {
      pts.push([(i / n) * w, base - (i % 2 ? amp * (0.55 + r2() * 0.45) : amp * r2() * 0.35)])
    }
    g.fillStyle = col
    g.beginPath()
    g.moveTo(0, h)
    pts.forEach((p) => g.lineTo(p[0], p[1]))
    g.lineTo(w, h)
    g.closePath()
    g.fill()
    if (snow) {
      g.fillStyle = 'rgba(250, 252, 255, 0.95)'
      for (let i = 1; i < pts.length - 1; i += 2) {
        const [px, py] = pts[i]
        const [lx, ly] = pts[i - 1]
        const [rx, ry] = pts[i + 1]
        const t = 0.32
        g.beginPath()
        g.moveTo(px, py)
        g.lineTo(px + (rx - px) * t, py + (ry - py) * t)
        g.lineTo(px + (rx - px) * t * 0.5, py + (ry - py) * t * 0.75)
        g.lineTo(px, py + (ry - py) * t * 0.55)
        g.lineTo(px + (lx - px) * t * 0.6, py + (ly - py) * t * 0.8)
        g.lineTo(px + (lx - px) * t, py + (ly - py) * t)
        g.closePath()
        g.fill()
      }
    }
  }
  peaks(h * 0.52, h * 0.34, 10, 77, '#8ea4b8', true)
  peaks(h * 0.62, h * 0.24, 8, 91, '#6d8798', true)
  fillRidge(g, w, h, h * 0.68, h * 0.03, 1.1, '#4f7360', 0.9)
  g.fillStyle = '#7fb0c9'
  g.fillRect(0, h * 0.71, w, h * 0.29)
  g.fillStyle = 'rgba(109, 135, 152, 0.35)'
  g.beginPath()
  g.moveTo(0, h * 0.71)
  for (let x = 0; x <= w; x += 8) {
    g.lineTo(x, h * 0.71 + (h * 0.71 - ridgeY(x, w, h * 0.62, h * 0.12, 3, 1)) * 0.35)
  }
  g.lineTo(w, h * 0.71)
  g.closePath()
  g.fill()
}

/** Jungle falls: a waterfall dropping through a gorge between two canopied cliffs. */
const paintFalls: Painter = (g, w, h, rnd) => {
  skyGradient(g, w, h, '#cfe0d4', '#e8efe2')
  fillRidge(g, w, h, h * 0.38, h * 0.06, 0.4, '#9fb9a6', 1)
  // Twin cliffs with a gorge
  const cliff = (x0: number, x1: number, top: number, col: string) => {
    g.fillStyle = col
    g.beginPath()
    g.moveTo(x0, h)
    g.lineTo(x0, top + h * 0.04)
    g.quadraticCurveTo((x0 + x1) / 2, top - h * 0.03, x1, top + h * 0.02)
    g.lineTo(x1 + (x1 > x0 ? -1 : 1) * w * 0.02, h)
    g.closePath()
    g.fill()
  }
  cliff(0, w * 0.44, h * 0.3, '#5d7a62')
  cliff(w, w * 0.56, h * 0.26, '#567459')
  // Waterfall
  g.fillStyle = 'rgba(236, 246, 250, 0.92)'
  g.beginPath()
  g.moveTo(w * 0.455, h * 0.32)
  g.lineTo(w * 0.545, h * 0.3)
  g.lineTo(w * 0.57, h * 0.8)
  g.lineTo(w * 0.43, h * 0.8)
  g.closePath()
  g.fill()
  g.strokeStyle = 'rgba(180, 214, 226, 0.8)'
  g.lineWidth = Math.max(1, w * 0.002)
  for (let i = 0; i < 9; i++) {
    const x = w * (0.46 + i * 0.01)
    g.beginPath()
    g.moveTo(x, h * 0.33)
    g.lineTo(x + (i - 4) * w * 0.003, h * 0.79)
    g.stroke()
  }
  g.fillStyle = 'rgba(245, 250, 252, 0.8)'
  for (let i = 0; i < 6; i++) {
    g.beginPath()
    g.ellipse(w * (0.44 + i * 0.024), h * 0.79, w * 0.03, h * 0.025, 0, 0, Math.PI * 2)
    g.fill()
  }
  // Canopy clumps on the cliff tops and faces
  const greens = ['#3f6b45', '#4f7f4f', '#2f5a3a', '#6a9358']
  for (let i = 0; i < 70; i++) {
    const left = i % 2 === 0
    const x = left ? rnd() * w * 0.42 : w * 0.58 + rnd() * w * 0.42
    const y = h * (0.26 + rnd() * 0.5)
    g.fillStyle = greens[i % greens.length]
    g.beginPath()
    g.arc(x, y, h * (0.018 + rnd() * 0.03), 0, Math.PI * 2)
    g.fill()
  }
  g.fillStyle = '#7db1ae'
  g.fillRect(0, h * 0.8, w, h * 0.2)
}

/** Desert mesa: three banded buttes on a scrub plain under a low sun. */
const paintMesa: Painter = (g, w, h, rnd) => {
  skyGradient(g, w, h, '#f2c9a0', '#f6e7cf')
  g.fillStyle = 'rgba(255, 240, 210, 0.8)'
  g.beginPath()
  g.arc(w * 0.25, h * 0.3, h * 0.06, 0, Math.PI * 2)
  g.fill()
  const butte = (
    cxn: number,
    wn: number,
    topn: number,
    basen: number,
    col: string,
    band: string,
  ) => {
    const x = cxn * w
    const bw = wn * w
    const top = topn * h
    const base = basen * h
    g.fillStyle = col
    g.beginPath()
    g.moveTo(x - bw * 0.65, base)
    g.lineTo(x - bw * 0.5, top + (base - top) * 0.25)
    g.lineTo(x - bw * 0.42, top)
    g.lineTo(x + bw * 0.42, top)
    g.lineTo(x + bw * 0.5, top + (base - top) * 0.25)
    g.lineTo(x + bw * 0.65, base)
    g.closePath()
    g.fill()
    g.fillStyle = band
    g.fillRect(x - bw * 0.46, top + (base - top) * 0.12, bw * 0.92, (base - top) * 0.05)
  }
  butte(0.18, 0.18, 0.42, 0.7, '#d99a6c', '#c7855a')
  butte(0.8, 0.24, 0.36, 0.7, '#cf8a5c', '#b97549')
  butte(0.52, 0.12, 0.5, 0.72, '#b8704a', '#a3603d')
  fillRidge(g, w, h, h * 0.72, h * 0.015, 2, '#e3b98c', 0.5)
  g.fillStyle = '#e8c79f'
  g.fillRect(0, h * 0.73, w, h * 0.27)
  g.fillStyle = '#7d8f5a'
  for (let i = 0; i < 14; i++) {
    g.beginPath()
    g.ellipse(rnd() * w, h * (0.75 + rnd() * 0.08), w * 0.008, h * 0.007, 0, 0, Math.PI * 2)
    g.fill()
  }
}

/** A loaded photo cropped (cover) to the canvas aspect, biased toward its upper part; else a blank wash. */
function paintCustom(
  g: CanvasRenderingContext2D,
  w: number,
  h: number,
  img: HTMLImageElement | null | undefined,
): void {
  if (img && img.complete) {
    const ir = img.width / img.height
    const cr = w / h
    let sw: number, sh: number, sx: number, sy: number
    if (ir > cr) {
      sh = img.height
      sw = sh * cr
      sx = (img.width - sw) / 2
      sy = 0
    } else {
      sw = img.width
      sh = sw / cr
      sx = 0
      sy = (img.height - sh) * 0.35
    }
    g.drawImage(img, sx, sy, sw, sh, 0, 0, w, h)
  } else {
    g.fillStyle = '#e4e8e0'
    g.fillRect(0, 0, w, h)
  }
}

const PAINTERS: Partial<Record<BackdropId, Painter>> = {
  karst: paintKarst,
  terraces: paintTerraces,
  pines: paintPines,
  alpine: paintAlpine,
  falls: paintFalls,
  mesa: paintMesa,
}

/**
 * Paints backdrop `id` into a `w x h` area of `g` (cleared first). `none` paints nothing; `custom`
 * paints `custom` when it has loaded.
 */
export function paintBackdrop(
  g: CanvasRenderingContext2D,
  id: BackdropId,
  w: number,
  h: number,
  custom?: HTMLImageElement | null,
): void {
  const rnd = seededRandom(1234 + id.length * 97)
  g.save()
  g.clearRect(0, 0, w, h)
  if (id === 'custom') paintCustom(g, w, h, custom)
  else PAINTERS[id]?.(g, w, h, rnd)
  g.restore()
}
