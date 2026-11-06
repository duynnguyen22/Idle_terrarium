import { mutateWorld } from '@/engine/engineBridge'
import { applyPreset } from '@/engine/presets'
import { selectAudioEnabled } from '@/store/selectors'
import { showToast } from '@/store/toastStore'
import { useStudioStore } from '@/store/useStudioStore'

const enterRelax = () => {
  // TODO(task-10): enter Relax Mode (hide chrome, show the relax dock).
}
const toggleAudio = () => {
  // TODO(task-10): toggle the ambient soundscape.
}
const takeSnapshot = () => {
  // TODO(task-11): export the canvas as a PNG.
}

const NEUTRAL =
  'h-8 rounded-lg bg-sand-pale hover:bg-sand-track text-ink-soft border border-sand-border inline-flex items-center shrink-0 transition'

export function UtilityActions() {
  const audioEnabled = useStudioStore(selectAudioEnabled)

  const randomBiome = () => {
    mutateWorld((w) => applyPreset(w, 'falls', useStudioStore.getState()))
    showToast('🎲 Crafted Semi-Aquatic Rainforest Waterfall!')
  }
  const clearAll = () => {
    mutateWorld((w) => {
      w.items = []
    })
    useStudioStore.getState().selectItem(null)
    showToast('Cleared all specimens')
  }

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <button
        type="button"
        onClick={enterRelax}
        title="Enter Full-Screen Zen Relax Mode (Shortcut: R)"
        className="inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-forest-mid px-3 text-xs font-semibold text-white shadow-xs transition hover:bg-forest-deep"
      >
        <span>🍃</span>
        <span>Relax Mode</span>
      </button>
      <button
        type="button"
        onClick={toggleAudio}
        aria-label="Toggle Ambient Soundscape"
        title="Toggle Ambient Soundscape"
        className={`${NEUTRAL} w-8 justify-center`}
      >
        <span>{audioEnabled ? '🔊' : '🔇'}</span>
      </button>
      <button
        type="button"
        onClick={randomBiome}
        title="Craft a Complete Semi-Aquatic or Mountain Terrarium"
        className={`${NEUTRAL} gap-1 whitespace-nowrap px-2.5 text-xs font-semibold`}
      >
        <span>🎲</span>
        <span>Biome</span>
      </button>
      <button
        type="button"
        onClick={clearAll}
        aria-label="Clear Placed Specimens"
        title="Clear Placed Specimens"
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-rose bg-rose-pale text-blood transition hover:bg-rose-light"
      >
        <svg
          className="h-3.5 w-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" />
        </svg>
      </button>
      <button
        type="button"
        onClick={takeSnapshot}
        className="inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-forest-deep px-3 text-xs font-semibold text-white shadow-xs transition hover:bg-forest-dark"
      >
        <span>📸</span>
        <span>Snapshot</span>
      </button>
    </div>
  )
}
