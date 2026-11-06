let canvas: HTMLCanvasElement | null = null

/** TerrariumCanvas registers its element here on mount so UI outside the stage (Snapshot) can reach it. */
export function registerTerrariumCanvas(el: HTMLCanvasElement | null): void {
  canvas = el
}

export function getTerrariumCanvas(): HTMLCanvasElement | null {
  return canvas
}
