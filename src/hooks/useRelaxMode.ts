import { useAtomValue, useSetAtom } from 'jotai'
import { useEffect, useRef } from 'react'
import { tourAtom } from '@/store/overlay'
import { audioEnabledAtom, relaxModeAtom } from '@/store/studio'

export const RELAX_IDLE_MS = 2600

/**
 * Body classes mirror the prototype: `relax-active` while relaxing (CSS hides the chrome), `relax-idle` after
 * 2.6 s without a pointer move (hides dock and cursor). Like the prototype, the idle timer arms on the first
 * pointermove, not on entry. Entering relax also turns audio on (prototype enterRelax). R/Escape stay in
 * useKeyboardShortcuts.
 */
export function useRelaxMode(): void {
  const relaxMode = useAtomValue(relaxModeAtom)
  const setTour = useSetAtom(tourAtom)
  const setAudioEnabled = useSetAtom(audioEnabledAtom)

  // Leaving relax mode (R, Escape, the dock's exit) ends any evening-visit tour.
  const wasRelaxing = useRef(relaxMode)
  useEffect(() => {
    if (wasRelaxing.current && !relaxMode) setTour(null)
    wasRelaxing.current = relaxMode
  }, [relaxMode, setTour])

  useEffect(() => {
    if (!relaxMode) return
    const body = document.body
    let timer: ReturnType<typeof setTimeout> | undefined
    body.classList.add('relax-active')
    setAudioEnabled(true)

    const onMove = () => {
      body.classList.remove('relax-idle')
      clearTimeout(timer)
      timer = setTimeout(() => body.classList.add('relax-idle'), RELAX_IDLE_MS)
    }
    window.addEventListener('pointermove', onMove)
    return () => {
      window.removeEventListener('pointermove', onMove)
      clearTimeout(timer)
      body.classList.remove('relax-active', 'relax-idle')
    }
  }, [relaxMode, setAudioEnabled])
}
