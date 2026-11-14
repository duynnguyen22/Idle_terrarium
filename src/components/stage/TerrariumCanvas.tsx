import { useAtomValue } from 'jotai'
import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { vesselKX } from '@/data/vessels'
import { commitWorld, tryGetWorld } from '@/engine/engineBridge'
import { toNormalized } from '@/engine/geometry'
import { applyTool, beginDrag, endDrag, hitTest, updateDrag } from '@/engine/interaction'
import { computeVesselRect } from '@/engine/render/renderFrame'
import { endMist } from '@/engine/simulation/mist'
import { camToBase } from '@/engine/view'
import {
  beginPan,
  beginPinch,
  doubleClick,
  movePan,
  movePinch,
  wheelZoom,
  type PanState,
  type PinchState,
} from '@/engine/viewInput'
import type { EngineWorld, Point } from '@/engine/world'
import { getCanvasCssSize, registerTerrariumCanvas, setCanvasCssSize } from '@/lib/terrariumCanvas'
import { play } from '@/hooks/useAudio'
import { useTerrariumEngine } from '@/hooks/useTerrariumEngine'
import { appStore } from '@/store/appStore'
import {
  activePourMaterialAtom,
  activeToolAtom,
  relaxModeAtom,
  selectedIdAtom,
  studioStateAtom,
  vesselAtom,
} from '@/store/studio'
import { showToast } from '@/store/toast'

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
  panning: boolean,
): CursorKind {
  if (panning) return 'grabbing'
  if (relaxMode) return 'default'
  if (tool === 'pour' && pourMaterial) return 'pour'
  if (tool === 'mist' || tool === 'prune' || tool === 'boost' || tool === 'scrub') return tool
  return dragging ? 'grabbing' : 'grab'
}

/** A client point in CSS px from the canvas top-left. */
function localPoint(canvas: HTMLCanvasElement | null, clientX: number, clientY: number): Point {
  const rect = canvas?.getBoundingClientRect()
  return rect ? { x: clientX - rect.left, y: clientY - rect.top } : { x: 0, y: 0 }
}

/**
 * The canvas's CSS size: the one the engine hook laid the frame out in, so pointer maths and drawing agree.
 * Falls back to the element's rect before the ResizeObserver has recorded one.
 */
function cssSize(canvas: HTMLCanvasElement): { w: number; h: number } {
  const s = getCanvasCssSize()
  if (s) return s
  const rect = canvas.getBoundingClientRect()
  return { w: rect.width, h: rect.height }
}

/** The vessel rect for a canvas of this CSS size. */
function vesselRect(w: number, h: number) {
  return computeVesselRect(w, h, appStore.get(relaxModeAtom), vesselKX(appStore.get(vesselAtom)))
}

/**
 * The only client -> normalized conversion: undoes the camera, then maps into the vessel rect. Also records
 * the pointer for parallax (-1..1 across the canvas).
 */
function normalize(
  canvas: HTMLCanvasElement | null,
  world: EngineWorld,
  clientX: number,
  clientY: number,
): { nx: number; ny: number } {
  if (!canvas) return { nx: 0, ny: 0 }
  const rect = canvas.getBoundingClientRect()
  const { w, h } = cssSize(canvas)
  const sx = clientX - rect.left
  const sy = clientY - rect.top
  if (w > 0 && h > 0) world.view.pointerScreen = { x: (sx / w) * 2 - 1, y: (sy / h) * 2 - 1 }
  const b = camToBase(world.view.cam, sx, sy, w, h)
  return toNormalized(b.x, b.y, { left: 0, top: 0 }, vesselRect(w, h))
}

/** Full-size canvas. It records its CSS size; the engine hook sizes the backing store from it each frame. */
export function TerrariumCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dragging, setDragging] = useState(false)
  const [panning, setPanning] = useState(false)
  // Pointers down on the canvas (CSS px from its top-left), and the camera gesture they drive.
  const pointers = useRef(new Map<number, Point>())
  const pan = useRef<PanState | null>(null)
  const pinch = useRef<PinchState | null>(null)
  const relaxMode = useAtomValue(relaxModeAtom)
  const activeTool = useAtomValue(activeToolAtom)
  const pourMaterial = useAtomValue(activePourMaterialAtom)
  useTerrariumEngine(canvasRef)

  useEffect(() => {
    registerTerrariumCanvas(canvasRef.current)
    return () => registerTerrariumCanvas(null)
  }, [])

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
  }, [])

  const local = (clientX: number, clientY: number) =>
    localPoint(canvasRef.current, clientX, clientY)
  const norm = (world: EngineWorld, clientX: number, clientY: number) =>
    normalize(canvasRef.current, world, clientX, clientY)

  const startPan = (world: EngineWorld, p: Point) => {
    const s = beginPan(world.view, p.x, p.y)
    if (!s) return
    pan.current = s
    setPanning(true)
  }

  const endPan = () => {
    if (!pan.current) return
    pan.current = null
    setPanning(false)
  }

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
  }, [])

  // Move / up listen on window so a drag keeps tracking when the pointer leaves the canvas (prototype 3238, 3284).
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const world = tryGetWorld()
      if (!world) return
      const ptrs = pointers.current
      const canvas = canvasRef.current
      if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, localPoint(canvas, e.clientX, e.clientY))
      if (pinch.current && ptrs.size >= 2) {
        const [a, b] = [...ptrs.values()]
        movePinch(world.view, pinch.current, a, b)
        return
      }
      if (pan.current) {
        const p = localPoint(canvas, e.clientX, e.clientY)
        movePan(world.view, pan.current, p.x, p.y)
        return
      }
      const { nx, ny } = normalize(canvas, world, e.clientX, e.clientY)
      world.pointerNorm = {
        x: Math.max(0.14, Math.min(0.86, nx)),
        y: Math.max(0.1, Math.min(0.86, ny)),
      }
      updateDrag(world, nx, ny, vesselKX(appStore.get(vesselAtom)))
    }
    const onUp = (e: PointerEvent) => {
      const world = tryGetWorld()
      pointers.current.delete(e.pointerId)
      if (pointers.current.size < 2) pinch.current = null
      endPan()
      if (!world) return
      world.view.gesture = pinch.current !== null
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
    // Right and middle clicks open a menu or autoscroll; their pointerup may never reach the page.
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const world = tryGetWorld()
    if (!world) return
    const store = appStore.get(studioStateAtom)
    const ptrs = pointers.current
    const here = local(e.clientX, e.clientY)
    // A new primary pointer starts a fresh gesture: drop entries left by a pointerup that never arrived.
    if (e.isPrimary) ptrs.clear()
    ptrs.set(e.pointerId, here)

    // A second finger turns whatever the first was doing into a pinch: end it cleanly first, or the plant
    // jumps to the finger midpoint.
    if (ptrs.size >= 2) {
      if (ptrs.size > 2) return
      let changed = false
      if (world.isMisting) {
        world.isMisting = false
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
      endPan()
      if (changed) commitWorld()
      const [a, b] = [...ptrs.values()]
      pinch.current = beginPinch(world.view, a, b)
      world.view.gesture = true
      return
    }

    if (store.relaxMode) {
      startPan(world, here)
      return
    }
    const { nx, ny } = norm(world, e.clientX, e.clientY)
    world.pointerNorm = { x: nx, y: ny }
    world.pointerInCanvas = true

    if (store.activeTool === 'pour' && store.activePourMaterial) {
      world.isPouring = true
      return
    }

    const kx = vesselKX(store.vessel)
    const effect = applyTool(world, store.activeTool, nx, ny, kx)
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

    const hit = hitTest(world, nx, ny, kx)
    if (hit) {
      appStore.set(selectedIdAtom, hit.uid)
      beginDrag(world, hit, nx, ny)
      setDragging(true)
    } else {
      appStore.set(selectedIdAtom, null)
      if (store.activeTool === 'select') startPan(world, here)
    }
  }

  const onDoubleClick = (e: ReactMouseEvent<HTMLCanvasElement>) => {
    const world = tryGetWorld()
    const canvas = canvasRef.current
    if (!world || !canvas) return
    const rect = canvas.getBoundingClientRect()
    const { w, h } = cssSize(canvas)
    doubleClick(
      world.view,
      world,
      vesselRect(w, h),
      vesselKX(appStore.get(vesselAtom)),
      e.clientX - rect.left,
      e.clientY - rect.top,
    )
  }

  const cursor = cursorFor(relaxMode, activeTool, pourMaterial, dragging, panning)
  return (
    <canvas
      ref={canvasRef}
      aria-label="Terrarium canvas"
      role="application"
      data-cursor={cursor}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
      onPointerEnter={() => {
        const world = tryGetWorld()
        if (world) world.pointerInCanvas = true
      }}
      onPointerLeave={() => {
        const world = tryGetWorld()
        if (!world) return
        world.pointerInCanvas = false
        world.view.pointerScreen = null
      }}
      className={`absolute inset-0 block h-full w-full touch-none ${CURSOR_CLASS[cursor]}`}
    />
  )
}
