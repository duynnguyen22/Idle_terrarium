import type { LightingId } from '@/data/types'
import { selectAutoLightSync, selectLighting } from '@/store/selectors'
import { showToast } from '@/store/toastStore'
import { useStudioStore } from '@/store/useStudioStore'

const PHASES: { id: LightingId; icon: string; label: string }[] = [
  { id: 'dawn', icon: '🌅', label: 'Dawn' },
  { id: 'sunlight', icon: '☀️', label: 'Day' },
  { id: 'twilight', icon: '🌇', label: 'Dusk' },
  { id: 'night', icon: '🌙', label: 'Night' },
]

export function LightingControls() {
  const lighting = useStudioStore(selectLighting)
  const autoSync = useStudioStore(selectAutoLightSync)
  const setLighting = useStudioStore((s) => s.setLighting)
  const setAutoLightSync = useStudioStore((s) => s.setAutoLightSync)

  const choose = (id: LightingId) => {
    setLighting(id)
    setAutoLightSync(false)
  }
  const toggleAuto = () => {
    const next = !autoSync
    setAutoLightSync(next)
    showToast(next ? '🕒 Lighting synced with local clock' : 'Lighting set to manual control')
  }

  return (
    <div className="flex shrink-0 items-center gap-1 rounded-xl border border-sand-border bg-sand-pale p-1">
      {PHASES.map((p) => {
        const active = p.id === lighting
        return (
          <button
            key={p.id}
            type="button"
            aria-pressed={active}
            onClick={() => choose(p.id)}
            className={`inline-flex h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-lg px-2.5 text-xs transition ${
              active
                ? 'bg-white font-semibold text-forest-deep shadow-2xs'
                : 'font-medium text-ink-umber hover:bg-white/60'
            }`}
          >
            <span>{p.icon}</span>
            <span>{p.label}</span>
          </button>
        )
      })}
      <button
        type="button"
        aria-pressed={autoSync}
        title="Automatically sync lighting with your local clock"
        onClick={toggleAuto}
        className={`inline-flex h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-lg px-2.5 text-xs font-semibold transition ${
          autoSync
            ? 'border border-sage bg-mint text-forest-deep'
            : 'border border-transparent text-ink-umber hover:bg-white/60'
        }`}
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
          <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
          <path d="M16 16h5v5" />
        </svg>
        <span>Auto Sync</span>
      </button>
    </div>
  )
}
