import { useAtomValue } from 'jotai'
import {
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { vesselKX } from '@/data/vessels'
import { tryGetWorld } from '@/engine/engineBridge'
import { doubleClick, type PanState, type PinchState } from '@/engine/viewInput'
import type { Point } from '@/engine/world'
import { useTerrariumEngine } from '@/hooks/useTerrariumEngine'
import { appStore } from '@/store/appStore'
import { activePourMaterialAtom, activeToolAtom, relaxModeAtom, vesselAtom } from '@/store/studio'
import { cssSize, vesselRect } from '@/components/stage/canvasCoordinates'
import type { CanvasGesture } from '@/components/stage/canvasGesture'
import { handlePointerDown } from '@/components/stage/canvasPointerDown'
import { useCanvasRegistration } from '@/components/stage/useCanvasRegistration'
import { useWheelZoom } from '@/components/stage/useWheelZoom'
import { useWindowPointerTracking } from '@/components/stage/useWindowPointerTracking'

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
  useCanvasRegistration(canvasRef)

  const gesture: CanvasGesture = { canvasRef, pointers, pan, pinch, setDragging, setPanning }
  useWheelZoom(canvasRef)
  useWindowPointerTracking(gesture)

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => handlePointerDown(gesture, e)

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
