import { fillRidge, skyGradient } from './skyAndRidge'
import type { Painter } from './types'

/** Desert mesa: three banded buttes on a scrub plain under a low sun. */
export const paintMesa: Painter = (g, w, h, rnd) => {
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
