import { seededRandom } from './random'
import { fillRidge, ridgeY, skyGradient } from './skyAndRidge'
import type { Painter } from './types'

/** Alpine lake: two snow-capped ranges, a wooded shore and the range reflected in the water. */
export const paintAlpine: Painter = (g, w, h) => {
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
