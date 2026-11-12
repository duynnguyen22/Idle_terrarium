import { useSetAtom } from 'jotai'
import { useEffect } from 'react'
import { reducedMotionAtom } from '@/store/studio'

const QUERY = '(prefers-reduced-motion: reduce)'

/** Mirrors the OS `prefers-reduced-motion` setting into `StudioState.reducedMotion` (not persisted). */
export function useReducedMotion(): void {
  const setReducedMotion = useSetAtom(reducedMotionAtom)
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const mql = window.matchMedia(QUERY)
    const apply = () => setReducedMotion(mql.matches)
    apply()
    mql.addEventListener('change', apply)
    return () => mql.removeEventListener('change', apply)
  }, [setReducedMotion])
}
