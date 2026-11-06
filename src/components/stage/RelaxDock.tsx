import { SOUND_PRESETS } from '@/data/soundPresets'
import type { LightingId } from '@/data/types'
import { selectRelaxMode, selectSoundPreset } from '@/store/selectors'
import { useStudioStore } from '@/store/useStudioStore'

const WEATHER: { id: LightingId; label: string }[] = [
  { id: 'dawn', label: '🌫️ Misty Dawn' },
  { id: 'sunlight', label: '🌦️ Sun Shower' },
  { id: 'twilight', label: '🌇 Golden Hour' },
  { id: 'night', label: '🌙 Moonlight' },
]

const DIVIDER = <span className="h-4 w-px bg-white/15" />

export function RelaxDock() {
  const relaxMode = useStudioStore(selectRelaxMode)
  const soundPreset = useStudioStore(selectSoundPreset)
  const setSoundPreset = useStudioStore((s) => s.setSoundPreset)
  const setLighting = useStudioStore((s) => s.setLighting)
  const setAutoLightSync = useStudioStore((s) => s.setAutoLightSync)
  const setRelaxMode = useStudioStore((s) => s.setRelaxMode)

  if (!relaxMode) return null

  return (
    <div
      id="relax-dock"
      className="absolute bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/15 bg-forest-night/85 px-4 py-2.5 text-white shadow-2xl backdrop-blur-xl"
    >
      <span className="font-serif-title whitespace-nowrap text-xs tracking-wide text-emerald-200">
        🍃 Sanctuary Relax
      </span>
      {DIVIDER}
      <div className="flex items-center gap-1">
        {SOUND_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            data-sound={p.id}
            aria-pressed={soundPreset === p.id}
            onClick={() => setSoundPreset(p.id)}
            className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium transition ${
              soundPreset === p.id
                ? 'bg-emerald-600/80 text-white'
                : 'text-white/75 hover:text-white'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {DIVIDER}
      <div className="flex items-center gap-1">
        {WEATHER.map((w) => (
          <button
            key={w.id}
            type="button"
            data-weather={w.id}
            onClick={() => {
              setLighting(w.id)
              setAutoLightSync(false)
            }}
            className="whitespace-nowrap rounded-full px-2 py-1 text-xs text-white/75 hover:text-white"
          >
            {w.label}
          </button>
        ))}
      </div>
      {DIVIDER}
      <button
        type="button"
        onClick={() => setRelaxMode(false)}
        className="whitespace-nowrap rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white transition hover:bg-white/25"
      >
        Exit (Esc)
      </button>
    </div>
  )
}
