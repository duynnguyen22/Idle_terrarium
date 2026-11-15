import { useEffect, useState } from 'react'
import { appStore } from '@/store/appStore'
import { relaxModeAtom } from '@/store/studio'
import { REFRESH_MS } from './growthBoardConstants'

/** While the board is open: re-render every second, and close it on Escape. */
export function useGrowthBoardLifecycle(open: boolean, setOpen: (open: boolean) => void): void {
  // The world mutates outside React, so a timer re-reads it while the board is open.
  const [, setTick] = useState(0)

  useEffect(() => {
    if (!open) return
    const timer = setInterval(() => setTick((n) => n + 1), REFRESH_MS)
    return () => clearInterval(timer)
  }, [open])

  useEffect(() => {
    if (!open) return
    // Capture phase + stopPropagation: Escape closes the board only, not relax mode or the selection.
    // Relax mode hides the board, so there Escape is left to leave relax mode.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || appStore.get(relaxModeAtom)) return
      e.stopPropagation()
      setOpen(false)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open, setOpen])
}
