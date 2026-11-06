import { useEffect } from 'react'
import { selectRelaxMode } from '@/store/selectors'
import { useStudioStore } from '@/store/useStudioStore'

export const RELAX_IDLE_MS = 2600

/**
 * Body classes mirror the prototype: `relax-active` while relaxing (CSS hides the chrome), `relax-idle` after
 * 2.6 s without a pointer move (hides dock and cursor). Like the prototype, the idle timer arms on the first
 * pointermove, not on entry. Entering relax also turns audio on (prototype enterRelax). R/Escape stay in
 * useKeyboardShortcuts.
 */
export function useRelaxMode(): void {
  const relaxMode = useStudioStore(selectRelaxMode)

  useEffect(() => {
    if (!relaxMode) return
    const body = document.body
    let timer: ReturnType<typeof setTimeout> | undefined
    body.classList.add('relax-active')
    useStudioStore.getState().setAudioEnabled(true)

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
  }, [relaxMode])
}
