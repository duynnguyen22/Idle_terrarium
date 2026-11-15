import { useEffect, type RefObject } from 'react'
import { registerTerrariumCanvas, setCanvasCssSize } from '@/lib/terrariumCanvas'

/** Registers the canvas element for UI outside the stage, and records its CSS size as it resizes. */
export function useCanvasRegistration(canvasRef: RefObject<HTMLCanvasElement | null>): void {
  useEffect(() => {
    registerTerrariumCanvas(canvasRef.current)
    return () => registerTerrariumCanvas(null)
  }, [canvasRef])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    // Only records the size: setting the backing store clears the canvas, so the hook does it at the
    // start of a frame.
    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect
      if (box) setCanvasCssSize(box.width, box.height)
    })
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [canvasRef])
}
