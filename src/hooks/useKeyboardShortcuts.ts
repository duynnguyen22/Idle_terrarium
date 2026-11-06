import { useEffect } from 'react'
import { useStudioStore } from '@/store/useStudioStore'

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.isContentEditable ||
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT'
  )
}

/** R toggles relax mode; Escape leaves relax mode, otherwise clears the selection. Ignored while typing. */
export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditable(e.target) || e.ctrlKey || e.metaKey || e.altKey) return
      const s = useStudioStore.getState()
      if (e.key === 'r' || e.key === 'R') {
        s.setRelaxMode(!s.relaxMode)
      } else if (e.key === 'Escape') {
        if (s.relaxMode) s.setRelaxMode(false)
        else if (s.selectedId !== null) s.selectItem(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
