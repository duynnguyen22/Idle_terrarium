import { useEffect } from 'react'
import { useStudioStore } from '@/store/useStudioStore'

const QUERY = '(prefers-reduced-motion: reduce)'

/** Mirrors the OS `prefers-reduced-motion` setting into `StudioState.reducedMotion` (not persisted). */
export function useReducedMotion(): void {
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const mql = window.matchMedia(QUERY)
    const apply = () => useStudioStore.getState().setReducedMotion(mql.matches)
    apply()
    mql.addEventListener('change', apply)
    return () => mql.removeEventListener('change', apply)
  }, [])
}
