import { fillRidge, ridgeY, skyGradient } from './skyAndRidge'
import type { Painter } from './types'

/** Misty pines: four ridges of conifers, each with a fog band at its foot. */
export const paintPines: Painter = (g, w, h, rnd) => {
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
