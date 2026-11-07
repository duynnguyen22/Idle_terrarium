import { LineIcon, type IconName } from '@/components/ui/LineIcon'
import type { LightingId } from '@/data/types'
import { selectAutoLightSync, selectLighting } from '@/store/selectors'
import { showToast } from '@/store/toastStore'
import { useStudioStore } from '@/store/useStudioStore'

const PHASES: { id: LightingId; icon: IconName; label: string }[] = [
  { id: 'dawn', icon: 'sunrise', label: 'Dawn' },
  { id: 'sunlight', icon: 'sun', label: 'Day' },
  { id: 'twilight', icon: 'sunset', label: 'Dusk' },
  { id: 'night', icon: 'moon', label: 'Night' },
]

const BTN =
  'inline-flex h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-lg px-2 text-xs transition'

/** Floating light switcher in the canvas corner (prototype #light-control); hidden in relax mode. */
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
    showToast(next ? 'Lighting follows your local clock' : 'Lighting set to manual control')
  }

  return (
    <div
      id="light-control"
      role="group"
      aria-label="Lighting"
      className="absolute right-3 top-3 z-20 flex items-center gap-0.5 rounded-xl border border-sand-border bg-paper/95 p-1 shadow-sm"
    >
      {PHASES.map((p) => {
        const active = p.id === lighting
        return (
          <button
            key={p.id}
            type="button"
            aria-pressed={active}
            aria-label={p.label}
            title={p.label}
            onClick={() => choose(p.id)}
            className={`${BTN} ${
              active
                ? 'bg-white font-semibold text-forest-deep shadow-sm'
                : 'font-medium text-ink-umber hover:bg-white/70'
            }`}
          >
            <LineIcon name={p.icon} />
            <span className="hidden 2xl:inline">{p.label}</span>
          </button>
        )
      })}
      <span className="mx-0.5 h-5 w-px bg-sand-border" />
      <button
        type="button"
        aria-pressed={autoSync}
        title="Follow your local clock"
        onClick={toggleAuto}
        className={`${BTN} font-semibold ${
          autoSync ? 'bg-[#dcebe0] text-forest-deep' : 'text-ink-umber hover:bg-white/70'
        }`}
      >
        <LineIcon name="auto" />
        <span>Auto</span>
      </button>
    </div>
  )
}
