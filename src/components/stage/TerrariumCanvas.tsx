import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { commitWorld, getWorld, tryGetWorld } from '@/engine/engineBridge'
import { toNormalized } from '@/engine/geometry'
import { applyTool, beginDrag, endDrag, hitTest, updateDrag } from '@/engine/interaction'
import { computeVesselRect } from '@/engine/render/renderFrame'
import { endMist } from '@/engine/simulation/mist'
import { registerTerrariumCanvas } from '@/lib/terrariumCanvas'
import { play } from '@/hooks/useAudio'
import { useTerrariumEngine } from '@/hooks/useTerrariumEngine'
import { showToast } from '@/store/toastStore'
import { useStudioStore } from '@/store/useStudioStore'

type CursorKind = 'default' | 'grab' | 'grabbing' | 'pour' | 'mist' | 'prune' | 'boost' | 'scrub'

const CURSOR_CLASS: Record<CursorKind, string> = {
  default: 'cursor-default',
  grab: 'cursor-grab',
  grabbing: 'cursor-grabbing',
  pour: 'cursor-crosshair',
  // The canvas draws a spray bottle at the pointer instead (artifact syncCareToolbarButtons).
  mist: 'cursor-none',
  prune: 'cursor-alias',
  boost: 'cursor-copy',
  scrub: 'cursor-pointer',
}

function cursorFor(
  relaxMode: boolean,
  tool: string,
  pourMaterial: string | null,
  dragging: boolean,
): CursorKind {
  if (relaxMode) return 'default'
  if (tool === 'pour' && pourMaterial) return 'pour'
  if (tool === 'mist' || tool === 'prune' || tool === 'boost' || tool === 'scrub') return tool
  return dragging ? 'grabbing' : 'grab'
}

/** Full-size canvas; the backing store follows the element size at DPR capped to 2. */
export function TerrariumCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dragging, setDragging] = useState(false)
  const relaxMode = useStudioStore((s) => s.relaxMode)
  const activeTool = useStudioStore((s) => s.activeTool)
  const pourMaterial = useStudioStore((s) => s.activePourMaterial)
  useTerrariumEngine(canvasRef)

  useEffect(() => {
    registerTerrariumCanvas(canvasRef.current)
    return () => registerTerrariumCanvas(null)
  }, [])

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

  const norm = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return { nx: 0, ny: 0 }
    const rect = canvas.getBoundingClientRect()
    const R = computeVesselRect(rect.width, rect.height, useStudioStore.getState().relaxMode)
    return toNormalized(clientX, clientY, rect, R)
  }

  // Move / up listen on window so a drag keeps tracking when the pointer leaves the canvas (prototype 3238, 3284).
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      let world
      try {
        world = getWorld()
      } catch {
        return
      }
      const { nx, ny } = norm(e.clientX, e.clientY)
      world.pointerNorm = {
        x: Math.max(0.14, Math.min(0.86, nx)),
        y: Math.max(0.1, Math.min(0.86, ny)),
      }
      updateDrag(world, nx, ny)
    }
    const onUp = () => {
      let world
      try {
        world = getWorld()
      } catch {
        return
      }
      let changed = false
      if (world.isMisting) {
        showToast(endMist(world))
        changed = true
      }
      if (world.isPouring) {
        world.isPouring = false
        changed = true
      }
      if (world.draggingId) {
        endDrag(world)
        setDragging(false)
        changed = true
      }
      if (changed) commitWorld()
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [])

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const store = useStudioStore.getState()
    if (store.relaxMode) return
    const world = getWorld()
    const { nx, ny } = norm(e.clientX, e.clientY)
    world.pointerNorm = { x: nx, y: ny }
    world.pointerInCanvas = true

    if (store.activeTool === 'pour' && store.activePourMaterial) {
      world.isPouring = true
      return
    }

    const effect = applyTool(world, store.activeTool, nx, ny)
    if (effect?.hold) {
      e.currentTarget.setPointerCapture?.(e.pointerId)
      return
    }
    if (effect) {
      if (effect.sound) play(effect.sound)
      if (effect.toast) showToast(effect.toast)
      commitWorld()
      return
    }

    const hit = hitTest(world, nx, ny)
    if (hit) {
      store.selectItem(hit.uid)
      beginDrag(world, hit, nx, ny)
      setDragging(true)
    } else {
      store.selectItem(null)
    }
  }

  const cursor = cursorFor(relaxMode, activeTool, pourMaterial, dragging)
  return (
    <canvas
      ref={canvasRef}
      aria-label="Terrarium canvas"
      role="application"
      data-cursor={cursor}
      onPointerDown={onPointerDown}
      onPointerEnter={() => {
        const world = tryGetWorld()
        if (world) world.pointerInCanvas = true
      }}
      onPointerLeave={() => {
        const world = tryGetWorld()
        if (world) world.pointerInCanvas = false
      }}
      className={`absolute inset-0 block h-full w-full touch-none ${CURSOR_CLASS[cursor]}`}
    />
  )
}
