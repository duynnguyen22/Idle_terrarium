import { useEffect, useRef } from 'react'
import { useTerrariumEngine } from '@/hooks/useTerrariumEngine'

/** Full-size canvas; the backing store follows the element size at DPR capped to 2. */
export function TerrariumCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useTerrariumEngine(canvasRef)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = (width: number, height: number) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
    }
    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect
      if (box) resize(box.width, box.height)
    })
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />
}
