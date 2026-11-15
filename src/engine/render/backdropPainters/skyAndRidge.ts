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

export function fillRidge(
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
