import { useEffect } from 'react'
import { vesselKX } from '@/data/vessels'
import { tryGetWorld } from '@/engine/engineBridge'
import { computeVesselRect } from '@/engine/render/renderFrame'
import { camHome, framePlants } from '@/engine/view'
import { startAudioFromGesture } from '@/hooks/useAudio'
import { appStore } from '@/store/appStore'
import { relaxModeAtom, selectedIdAtom, vesselAtom } from '@/store/studio'

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.isContentEditable ||
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT'
  )
}

/** F and the frame button: zoom to the planted band of the current canvas (prototype camFramePlants). */
export function frameThePlants(relaxMode: boolean): void {
  const world = tryGetWorld()
  const size = world?.view.size
  if (!world || !size) return
  const R = computeVesselRect(size.w, size.h, relaxMode, vesselKX(appStore.get(vesselAtom)))
  framePlants(world.view, world, R)
}

/**
 * R toggles relax mode; Escape leaves relax mode, otherwise clears the selection; F frames the plants and 0
 * shows the whole tank. Ignored while typing.
 */
export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditable(e.target) || e.ctrlKey || e.metaKey || e.altKey) return
      // Read once, before the write: entering relax (it was off) also starts audio.
      const relaxMode = appStore.get(relaxModeAtom)
      if (e.key === 'r' || e.key === 'R') {
        appStore.set(relaxModeAtom, !relaxMode)
        if (!relaxMode) startAudioFromGesture()
      } else if (e.key === 'Escape') {
        if (relaxMode) appStore.set(relaxModeAtom, false)
        else if (appStore.get(selectedIdAtom) !== null) appStore.set(selectedIdAtom, null)
      } else if (e.key === 'f' || e.key === 'F') {
        frameThePlants(relaxMode)
      } else if (e.key === '0') {
        const world = tryGetWorld()
        if (world) camHome(world.view)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
