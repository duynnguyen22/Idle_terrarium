import { useAtomValue } from 'jotai'
import { useEffect, useRef } from 'react'
import { tryGetWorld } from '@/engine/engineBridge'
import type { Cam } from '@/engine/view'
import { frameThePlants } from '@/hooks/useKeyboardShortcuts'
import { appStore } from '@/store/appStore'
import { isHandheldAtom, layoutModeAtom, stagePadPxAtom, viewportHeightAtom } from '@/store/layout'
import { relaxModeAtom } from '@/store/studio'

/** True while the camera is still where the last automatic framing put it (or nothing was framed yet). */
export function camUntouched(t: Cam, auto: Cam | null, tol = 0.02): boolean {
  if (!auto) return true
  return (
    Math.abs(t.z - auto.z) < tol && Math.abs(t.u - auto.u) < tol && Math.abs(t.v - auto.v) < tol
  )
}

/**
 * On a handheld layout, re-frames the plants when the visible part of the tank changes size (a sheet opens,
 * resizes or closes, or the screen rotates), unless the user has moved the camera since the last automatic
 * frame (prototype reframe). Switching between handheld and desktop forgets that frame.
 */
export function usePhoneReframe(): void {
  const pad = useAtomValue(stagePadPxAtom)
  const mode = useAtomValue(layoutModeAtom)
  const viewportH = useAtomValue(viewportHeightAtom)
  const handheld = useAtomValue(isHandheldAtom)
  const autoCam = useRef<Cam | null>(null)
  const wasHandheld = useRef(handheld)

  useEffect(() => {
    if (wasHandheld.current !== handheld) {
      wasHandheld.current = handheld
      autoCam.current = null
    }
    if (!handheld) return
    let second = 0
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        const world = tryGetWorld()
        const relaxMode = appStore.get(relaxModeAtom)
        if (!world || relaxMode || world.items.length === 0 || world.view.follow) return
        if (!camUntouched(world.view.camT, autoCam.current)) return
        frameThePlants(false)
        autoCam.current = { ...world.view.camT }
      })
    })
    return () => {
      cancelAnimationFrame(first)
      cancelAnimationFrame(second)
    }
  }, [pad, mode, handheld, viewportH])
}
