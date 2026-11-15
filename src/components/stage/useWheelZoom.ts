import { useEffect, type RefObject } from 'react'
import { tryGetWorld } from '@/engine/engineBridge'
import { wheelZoom } from '@/engine/viewInput'

/** Zooms the camera with the mouse wheel or a trackpad pinch over the canvas. */
export function useWheelZoom(canvasRef: RefObject<HTMLCanvasElement | null>): void {
  // The wheel listener must be active (React's onWheel is passive) so it can stop the page scrolling.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const world = tryGetWorld()
      if (!world) return
      const rect = canvas.getBoundingClientRect()
      wheelZoom(world.view, e.clientX - rect.left, e.clientY - rect.top, e.deltaY, e.ctrlKey)
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [canvasRef])
}
