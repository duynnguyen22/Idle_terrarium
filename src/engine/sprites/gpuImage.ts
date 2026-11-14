// A finished picture is handed to the graphics card once and drawn from there afterwards.
// Only for canvases that never change after first paint: the bitmap is a frozen copy.
const gpuImages = new WeakMap<HTMLCanvasElement, { bmp: ImageBitmap | null }>()

export function gpuImage(src: HTMLCanvasElement, enabled: boolean): CanvasImageSource {
  if (!enabled || typeof createImageBitmap !== 'function' || src.width === 0) return src
  let entry = gpuImages.get(src)
  if (!entry) {
    const fresh: { bmp: ImageBitmap | null } = { bmp: null }
    entry = fresh
    gpuImages.set(src, fresh)
    createImageBitmap(src)
      .then((bmp) => {
        fresh.bmp = bmp
      })
      .catch(() => {
        /* keep drawing the canvas */
      })
  }
  return entry.bmp ?? src
}
