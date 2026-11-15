/** A loaded photo cropped (cover) to the canvas aspect, biased toward its upper part; else a blank wash. */
export function paintCustom(
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
