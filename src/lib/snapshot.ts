/**
 * Saves the on-screen terrarium canvas as a PNG. Mirrors the prototype's `btn-snapshot` handler: the live
 * canvas is exported as-is (its backing store is already DPR-capped at 2 by TerrariumCanvas), so no second
 * render pass is needed. Resolves false when the browser could not encode the canvas.
 */
export function exportSnapshotPng(canvas: HTMLCanvasElement, filename: string): Promise<boolean> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve(false)
        return
      }
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.download = filename
      link.href = url
      link.click()
      // Revoke after the click has been handled so the download can start.
      setTimeout(() => URL.revokeObjectURL(url), 0)
      resolve(true)
    }, 'image/png')
  })
}

/** Prototype filename: botanica-living-biosphere-day-<floor(dayCount)>.png */
export function snapshotFilename(dayCount: number): string {
  return `botanica-living-biosphere-day-${Math.floor(dayCount)}.png`
}
