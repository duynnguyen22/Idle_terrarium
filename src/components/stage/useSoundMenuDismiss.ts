import { useEffect, type RefObject } from 'react'

/**
 * While the relax dock's sound menu is open, Escape and a press outside the dock close it. `setMenuOpen`
 * and the refs keep their identity, so the listeners follow `menuOpen` only.
 */
export function useSoundMenuDismiss(
  menuOpen: boolean,
  setMenuOpen: (open: boolean) => void,
  dockRef: RefObject<HTMLDivElement | null>,
  triggerRef: RefObject<HTMLButtonElement | null>,
): void {
  // While the menu is open: Escape closes it (before the global handler can exit relax mode),
  // and a press anywhere outside the dock closes it.
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      setMenuOpen(false)
      triggerRef.current?.focus()
    }
    const onPointer = (e: PointerEvent) => {
      if (!dockRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey, { capture: true })
    window.addEventListener('pointerdown', onPointer)
    return () => {
      window.removeEventListener('keydown', onKey, { capture: true })
      window.removeEventListener('pointerdown', onPointer)
    }
  }, [menuOpen, setMenuOpen, dockRef, triggerRef])
}
