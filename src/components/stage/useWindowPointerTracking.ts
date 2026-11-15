import { useEffect } from 'react'
import { vesselKX } from '@/data/vessels'
import { commitWorld, tryGetWorld } from '@/engine/engineBridge'
import { endDrag, updateDrag } from '@/engine/interaction'
import { endMist } from '@/engine/simulation/mist'
import { movePan, movePinch } from '@/engine/viewInput'
import { appStore } from '@/store/appStore'
import { vesselAtom } from '@/store/studio'
import { showToast } from '@/store/toast'
import { localPoint, normalize } from '@/components/stage/canvasCoordinates'
import { endPan, type CanvasGesture } from '@/components/stage/canvasGesture'

/**
 * Tracks pointer moves and releases anywhere on the page for the gesture a canvas press started. Every
 * field of the gesture is a ref or a state setter, so the listeners are attached once, on mount.
 */
export function useWindowPointerTracking({
  canvasRef,
  pointers,
  pan,
  pinch,
  setDragging,
  setPanning,
}: CanvasGesture): void {
  // Move / up listen on window so a drag keeps tracking when the pointer leaves the canvas (prototype 3238, 3284).
  useEffect(() => {
    const g: CanvasGesture = { canvasRef, pointers, pan, pinch, setDragging, setPanning }
    const onMove = (e: PointerEvent) => {
      const world = tryGetWorld()
      if (!world) return
      const ptrs = g.pointers.current
      const canvas = g.canvasRef.current
      if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, localPoint(canvas, e.clientX, e.clientY))
      if (g.pinch.current && ptrs.size >= 2) {
        const [a, b] = [...ptrs.values()]
        movePinch(world.view, g.pinch.current, a, b)
        return
      }
      if (g.pan.current) {
        const p = localPoint(canvas, e.clientX, e.clientY)
        movePan(world.view, g.pan.current, p.x, p.y)
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
      g.pointers.current.delete(e.pointerId)
      if (g.pointers.current.size < 2) g.pinch.current = null
      endPan(g)
      if (!world) return
      world.view.gesture = g.pinch.current !== null
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
        g.setDragging(false)
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
  }, [canvasRef, pointers, pan, pinch, setDragging, setPanning])
}
