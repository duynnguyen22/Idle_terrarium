import { useEffect, useRef } from 'react'
import type { DrawerSide } from '@/store/overlay'

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

/** While a drawer is open: Escape closes it; focus moves into it on open and back to its toggle on close. */
export function useDrawerA11y(
  drawer: DrawerSide | null,
  setDrawer: (d: DrawerSide | null) => void,
) {
  useEffect(() => {
    if (!drawer) return
    // Capture phase + stopPropagation: Escape closes the drawer only, so the global shortcut handler
    // (relax exit / clear selection) does not also fire on the same keypress.
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      setDrawer(null)
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [drawer, setDrawer])

  // Focus management: into the drawer on open, back to its toggle on close.
  const prevDrawer = useRef<DrawerSide | null>(null)
  useEffect(() => {
    const prev = prevDrawer.current
    prevDrawer.current = drawer
    if (drawer) {
      const panel = document.getElementById(`${drawer}-sidebar`)
      const first = panel?.querySelector<HTMLElement>(FOCUSABLE)
      ;(first ?? panel)?.focus()
    } else if (prev) {
      document.querySelector<HTMLElement>(`[aria-controls="${prev}-sidebar"]`)?.focus()
    }
  }, [drawer])
}
