import { useShallow } from 'zustand/react/shallow'
import { selectHardware } from '@/store/selectors'
import { useStudioStore, type HardwareKey } from '@/store/useStudioStore'

const ITEMS: { key: HardwareKey; icon: string; label: string }[] = [
  { key: 'hasGrowLamp', icon: '💡', label: 'Halo LED Lamp' },
  { key: 'hasFogger', icon: '🌫️', label: 'Mist Fogger' },
]

export function HardwareToggles() {
  const hardware = useStudioStore(useShallow(selectHardware))
  const toggleHardware = useStudioStore((s) => s.toggleHardware)
  return (
    <div className="mt-2.5 grid grid-cols-2 gap-2">
      {ITEMS.map(({ key, icon, label }) => {
        const on = hardware[key]
        return (
          <button
            key={key}
            type="button"
            aria-pressed={on}
            onClick={() => toggleHardware(key)}
            className="flex items-center justify-between rounded-xl border border-sand-border bg-white px-2.5 py-2 text-xs font-semibold text-forest-deep shadow-2xs transition"
          >
            <span className="inline-flex items-center gap-1.5">
              <span>{icon}</span>
              <span>{label}</span>
            </span>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] ${on ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'}`}
            >
              {on ? 'ON' : 'OFF'}
            </span>
          </button>
        )
      })}
    </div>
  )
}
