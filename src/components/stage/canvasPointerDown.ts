import type { PointerEvent as ReactPointerEvent } from 'react'
import { vesselKX } from '@/data/vessels'
import { commitWorld, tryGetWorld } from '@/engine/engineBridge'
import { applyTool, beginDrag, endDrag, hitTest } from '@/engine/interaction'
import { beginPinch } from '@/engine/viewInput'
import type { EngineWorld } from '@/engine/world'
import { play } from '@/services/audio'
import { appStore } from '@/store/appStore'
import { selectedIdAtom, studioStateAtom } from '@/store/studio'
import { showToast } from '@/store/toast'
import { localPoint, normalize } from '@/components/stage/canvasCoordinates'
import { endPan, startPan, type CanvasGesture } from '@/components/stage/canvasGesture'

/**
 * A second finger turns whatever the first was doing into a pinch: end it cleanly first, or the plant
 * jumps to the finger midpoint.
 */
function startPinch(g: CanvasGesture, world: EngineWorld): void {
  const ptrs = g.pointers.current
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
    g.setDragging(false)
    changed = true
  }
  endPan(g)
  if (changed) commitWorld()
  const [a, b] = [...ptrs.values()]
  g.pinch.current = beginPinch(world.view, a, b)
  world.view.gesture = true
}

/** A press on the canvas: a pinch, a pan, a pour, the active tool, or picking up (or deselecting) an item. */
export function handlePointerDown(g: CanvasGesture, e: ReactPointerEvent<HTMLCanvasElement>): void {
  // Right and middle clicks open a menu or autoscroll; their pointerup may never reach the page.
  if (e.pointerType === 'mouse' && e.button !== 0) return
  const world = tryGetWorld()
  if (!world) return
  const store = appStore.get(studioStateAtom)
  const ptrs = g.pointers.current
  const here = localPoint(g.canvasRef.current, e.clientX, e.clientY)
  // A new primary pointer starts a fresh gesture: drop entries left by a pointerup that never arrived.
  if (e.isPrimary) ptrs.clear()
  ptrs.set(e.pointerId, here)

  if (ptrs.size >= 2) {
    if (ptrs.size > 2) return
    startPinch(g, world)
    return
  }

  if (store.relaxMode) {
    startPan(g, world, here)
    return
  }
  const { nx, ny } = normalize(g.canvasRef.current, world, e.clientX, e.clientY)
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
    g.setDragging(true)
  } else {
    appStore.set(selectedIdAtom, null)
    if (store.activeTool === 'select') startPan(g, world, here)
  }
}
