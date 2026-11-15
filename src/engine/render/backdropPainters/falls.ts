import { fillRidge, skyGradient } from './skyAndRidge'
import type { Painter } from './types'

/** Jungle falls: a waterfall dropping through a gorge between two canopied cliffs. */
export const paintFalls: Painter = (g, w, h, rnd) => {
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
