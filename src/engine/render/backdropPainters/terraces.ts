import { fillRidge, ridgeY, skyGradient } from './skyAndRidge'
import type { Painter } from './types'

/** Rice terraces: sixteen contour bands under two far ridges, with a stilt house. */
export const paintTerraces: Painter = (g, w, h) => {
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
