import { skyGradient } from './skyAndRidge'
import type { Painter, Rnd } from './types'

type Ctx = CanvasRenderingContext2D

interface KarstLayer {
  col: string
  count: number
  base: number
  hmin: number
  hmax: number
  wmin: number
  wmax: number
}

const KARST_LAYERS: KarstLayer[] = [
  { col: '#b9cfd2', count: 9, base: 0.62, hmin: 0.18, hmax: 0.3, wmin: 0.05, wmax: 0.09 },
  { col: '#8fb0ae', count: 7, base: 0.68, hmin: 0.22, hmax: 0.36, wmin: 0.06, wmax: 0.11 },
  { col: '#5f8a7c', count: 5, base: 0.74, hmin: 0.26, hmax: 0.42, wmin: 0.08, wmax: 0.13 },
]

/** A soft sun glow in the haze. */
function paintSunHaze(g: Ctx, w: number, h: number): void {
  g.fillStyle = 'rgba(255, 246, 214, 0.55)'
  g.beginPath()
  g.arc(w * 0.72, h * 0.24, h * 0.07, 0, Math.PI * 2)
  g.fill()
}

/** One limestone tower: a three-curve silhouette rising from the base line `by`. */
function paintTower(g: Ctx, col: string, tx: number, tw: number, th: number, by: number): void {
  g.fillStyle = col
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
  g.bezierCurveTo(tx + tw * 0.6, by - th * 0.25, tx + tw * 0.66, by - th * 0.08, tx + tw * 0.62, by)
  g.closePath()
  g.fill()
}

/** Seven green tree dots scattered over a front-layer tower. */
function paintTowerTrees(g: Ctx, rnd: Rnd, tx: number, tw: number, th: number, by: number): void {
  g.fillStyle = 'rgba(62, 104, 76, 0.55)'
  for (let k = 0; k < 7; k++) {
    g.beginPath()
    g.arc(tx + (rnd() - 0.5) * tw * 0.8, by - th * (0.25 + rnd() * 0.7), tw * 0.08, 0, Math.PI * 2)
    g.fill()
  }
}

/** Mist band between layers. */
function paintMistBand(g: Ctx, w: number, h: number, base: number): void {
  const mist = g.createLinearGradient(0, base * h - h * 0.07, 0, base * h)
  mist.addColorStop(0, 'rgba(238, 244, 240, 0)')
  mist.addColorStop(1, 'rgba(238, 244, 240, 0.7)')
  g.fillStyle = mist
  g.fillRect(0, base * h - h * 0.07, w, h * 0.07)
}

/** One layer of towers (the front layer also gets trees), then the mist band at its foot. */
function paintTowerLayer(g: Ctx, w: number, h: number, rnd: Rnd, L: KarstLayer, li: number): void {
  for (let i = 0; i < L.count; i++) {
    const tx = ((i + 0.2 + rnd() * 0.6) / L.count) * w
    const tw = (L.wmin + rnd() * (L.wmax - L.wmin)) * w
    const th = (L.hmin + rnd() * (L.hmax - L.hmin)) * h
    const by = L.base * h
    paintTower(g, L.col, tx, tw, th, by)
    if (li === 2) paintTowerTrees(g, rnd, tx, tw, th, by)
  }
  paintMistBand(g, w, h, L.base)
}

/** Bay water with reflections. */
function paintBayWater(g: Ctx, w: number, h: number, rnd: Rnd): void {
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
}

/** Junk boat with battened sails. */
function paintJunkBoat(g: Ctx, w: number, h: number): void {
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

/** Ha Long Bay: three layers of misty limestone towers over a bay with a junk boat. */
export const paintKarst: Painter = (g, w, h, rnd) => {
  skyGradient(g, w, h, '#cfe3e6', '#eef2e6')
  paintSunHaze(g, w, h)
  KARST_LAYERS.forEach((L, li) => paintTowerLayer(g, w, h, rnd, L, li))
  paintBayWater(g, w, h, rnd)
  paintJunkBoat(g, w, h)
}
