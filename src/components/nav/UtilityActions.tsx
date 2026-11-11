import { useEffect, useRef, useState } from 'react'
import { AccountChip } from '@/components/account/AccountChip'
import { LineIcon } from '@/components/ui/LineIcon'
import { startAudioFromGesture, stopAudio } from '@/hooks/useAudio'
import { mutateWorld } from '@/engine/engineBridge'
import { applyPreset } from '@/engine/presets'
import { selectAudioEnabled } from '@/store/selectors'
import { exportSnapshotPng, snapshotFilename } from '@/lib/snapshot'
import { getTerrariumCanvas } from '@/lib/terrariumCanvas'
import { previewGap } from '@/store/awayFlow'
import { showToast } from '@/store/toastStore'
import { useOverlayStore } from '@/store/useOverlayStore'
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

const showLastSummary = () => {
  if (useStudioStore.getState().awayLog.length === 0) {
    showToast('No time away recorded yet. Come back later, or preview a gap below.')
  } else useOverlayStore.getState().openAway(0)
}

const GAPS: { label: string; hours: number }[] = [
  { label: '8 h', hours: 8 },
  { label: '1 day', hours: 24 },
  { label: '3 days', hours: 72 },
  { label: '1 week', hours: 168 },
]

const NEUTRAL =
  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sand-pale text-ink-soft transition hover:bg-sand-track'
const MENU_ITEM =
  'inline-flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium'

/** "⋯" button with the rarely used, destructive actions (prototype #more-menu). */
function MoreMenu() {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const catchupEnabled = useStudioStore((s) => s.catchupEnabled)

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

  const toggleCatchup = () => {
    const next = !catchupEnabled
    useStudioStore.getState().setCatchupEnabled(next)
    showToast(
      next
        ? 'The tank will keep growing while you are away'
        : 'Growing while away is off. The tank waits for you.',
    )
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
          <div className="mt-1 border-t border-sand-border px-3 pb-1 pt-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
              Time away
            </p>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={run(showLastSummary)}
            className={`${MENU_ITEM} text-ink-deep hover:bg-linen`}
          >
            Show the last summary
          </button>
          <div className="px-3 py-1">
            <p className="mb-1 text-xs font-medium text-ink-deep">Preview a gap</p>
            <div className="flex gap-1">
              {GAPS.map((g) => (
                <button
                  key={g.hours}
                  type="button"
                  onClick={run(() => previewGap(g.hours))}
                  className="flex-1 rounded-lg bg-sand-pale px-1 py-1 text-[11px] font-medium text-ink-soft transition hover:bg-sand-track"
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={catchupEnabled}
            onClick={toggleCatchup}
            className={`${MENU_ITEM} justify-between text-ink-deep hover:bg-linen`}
          >
            Grow while I&apos;m away
            <span
              aria-hidden="true"
              className={`inline-flex h-4 w-7 shrink-0 items-center rounded-full px-0.5 transition ${catchupEnabled ? 'bg-forest-mid' : 'bg-sand-track'}`}
            >
              <span
                className={`h-3 w-3 rounded-full bg-white transition ${catchupEnabled ? 'translate-x-3' : ''}`}
              />
            </span>
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
      <AccountChip />
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
