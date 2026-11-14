let canvas: HTMLCanvasElement | null = null
let cssSize: { w: number; h: number } | null = null

/**
 * TerrariumCanvas registers its element here on mount so UI outside the stage (Snapshot) can reach it.
 * Unregistering (`null`) also forgets the recorded CSS size.
 */
export function registerTerrariumCanvas(el: HTMLCanvasElement | null): void {
  canvas = el
  if (!el) cssSize = null
}

export function getTerrariumCanvas(): HTMLCanvasElement | null {
  return canvas
}

/** TerrariumCanvas's ResizeObserver records the element's CSS size here; nothing else writes it. */
export function setCanvasCssSize(w: number, h: number): void {
  cssSize = { w, h }
}

/**
 * The canvas's CSS size, the one source for layout (the frame's W x H and `view.size`) and for pointer
 * normalisation; null until the element has been measured. The engine hook sizes the backing store from it.
 */
export function getCanvasCssSize(): { w: number; h: number } | null {
  return cssSize
}
