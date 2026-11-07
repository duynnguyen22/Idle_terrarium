import { useEffect, useRef, useState } from 'react'
import { LineIcon } from '@/components/ui/LineIcon'
import { startAudioFromGesture, stopAudio } from '@/hooks/useAudio'
import { mutateWorld } from '@/engine/engineBridge'
import { applyPreset } from '@/engine/presets'
import { selectAudioEnabled } from '@/store/selectors'
import { exportSnapshotPng, snapshotFilename } from '@/lib/snapshot'
import { getTerrariumCanvas } from '@/lib/terrariumCanvas'
import { showToast } from '@/store/toastStore'
import { useStudioStore } from '@/store/useStudioStore'

const enterRelax = () => {
  useStudioStore.getState().setRelaxMode(true)
  startAudioFromGesture()
}
const toggleAudio = () => {
  // Starting must happen inside this click (gesture); stopping must not create an AudioContext.
  if (useStudioStore.getState().audioEnabled) stopAudio()
  else startAudioFromGesture()
}
const takeSnapshot = async () => {
  const canvas = getTerrariumCanvas()
  if (!canvas) return
  const ok = await exportSnapshotPng(canvas, snapshotFilename(useStudioStore.getState().dayCount))
  if (ok) showToast('Snapshot saved')
}
const rebuildFalls = () => {
  let message = ''
  mutateWorld((w) => {
    message = applyPreset(w, 'falls', useStudioStore.getState())
  })
  showToast(message)
}
const clearAll = () => {
  mutateWorld((w) => {
    w.items = []
  })
  useStudioStore.getState().selectItem(null)
  showToast('Cleared all specimens')
}

const NEUTRAL =
  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sand-pale text-ink-soft transition hover:bg-sand-track'
const MENU_ITEM =
  'inline-flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium'

/** "⋯" button with the rarely used, destructive actions (prototype #more-menu). */
function MoreMenu() {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    // Capture phase + stopPropagation: Escape closes the menu only, not relax mode or the selection.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [open])

  const run = (fn: () => void) => () => {
    setOpen(false)
    fn()
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="more-menu"
        aria-label="More actions"
        title="More actions"
        onClick={() => setOpen((o) => !o)}
        className={NEUTRAL}
      >
        <LineIcon name="more" />
      </button>
      {open && (
        <div
          id="more-menu"
          role="menu"
          className="fixed right-4 top-14 z-50 w-60 rounded-xl border border-sand-border bg-white p-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={run(rebuildFalls)}
            className={`${MENU_ITEM} text-ink-deep hover:bg-linen`}
          >
            <LineIcon name="dice" />
            Rebuild the Falls Lake paludarium
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={run(clearAll)}
            className={`${MENU_ITEM} text-rose-700 hover:bg-rose-50`}
          >
            <LineIcon name="trash" />
            Clear all specimens
          </button>
        </div>
      )}
    </div>
  )
}

export function UtilityActions() {
  const audioEnabled = useStudioStore(selectAudioEnabled)

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <button
        type="button"
        onClick={enterRelax}
        title="Full-screen relax mode (R)"
        className="inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-forest-mid px-3 text-xs font-semibold text-white transition hover:bg-forest-deep"
      >
        <LineIcon name="leaf" />
        <span>Relax</span>
      </button>
      <button
        type="button"
        onClick={toggleAudio}
        aria-label="Ambient sound"
        aria-pressed={audioEnabled}
        title="Ambient sound"
        className={NEUTRAL}
      >
        <LineIcon name={audioEnabled ? 'vol' : 'mute'} />
      </button>
      <button
        type="button"
        onClick={() => void takeSnapshot()}
        aria-label="Snapshot"
        title="Save a PNG snapshot of the terrarium"
        className="inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-forest-deep px-3 text-xs font-semibold text-white transition hover:bg-forest-dark"
      >
        <LineIcon name="camera" />
        <span className="hidden lg:inline">Snapshot</span>
      </button>
      <MoreMenu />
    </div>
  )
}
