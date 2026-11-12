import { useEffect } from 'react'
import { startAudioFromGesture } from '@/hooks/useAudio'
import { appStore } from '@/store/appStore'
import { relaxModeAtom, selectedIdAtom } from '@/store/studio'

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
      // Read once, before the write: entering relax (it was off) also starts audio.
      const relaxMode = appStore.get(relaxModeAtom)
      if (e.key === 'r' || e.key === 'R') {
        appStore.set(relaxModeAtom, !relaxMode)
        if (!relaxMode) startAudioFromGesture()
      } else if (e.key === 'Escape') {
        if (relaxMode) appStore.set(relaxModeAtom, false)
        else if (appStore.get(selectedIdAtom) !== null) appStore.set(selectedIdAtom, null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
