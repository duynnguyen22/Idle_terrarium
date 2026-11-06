import type { LightingId } from '@/data/types'
import { advanceDay } from '@/engine/simulation/growth'
import { mutateWorld } from '@/engine/engineBridge'
import { play } from '@/hooks/useAudio'
import { useLocalClock } from '@/hooks/useLocalClock'
import { selectDayCount, selectLighting } from '@/store/selectors'
import { showToast } from '@/store/toastStore'
import { useStudioStore } from '@/store/useStudioStore'

const PHASE_ICONS: Record<LightingId, string> = {
  dawn: '🌅',
  sunlight: '☀️',
  twilight: '🌇',
  night: '🌙',
}

const PHASE_BADGES: Record<LightingId, string> = {
  dawn: 'DAWN · DEW CONDENSATION',
  sunlight: 'DAY · PHOTOSYNTHESIS',
  twilight: 'DUSK · GOLDEN HOUR',
  night: 'NIGHT · RESPIRATION',
}

const BTN = 'h-8 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition'
const ACTIVE = 'bg-forest-deep text-white shadow-xs'
const IDLE = 'text-ink-brown hover:bg-white/60'

const selectSpeed = (s: { timeSpeed: number; realTimeMode: boolean }) =>
  `${s.realTimeMode ? 'rt' : 'm'}:${s.timeSpeed}`

export function ClockSpeedPill() {
  const lighting = useStudioStore(selectLighting)
  const dayCount = useStudioStore(selectDayCount)
  const speedKey = useStudioStore(selectSpeed)
  const setTimeSpeed = useStudioStore((s) => s.setTimeSpeed)
  const setRealTimeMode = useStudioStore((s) => s.setRealTimeMode)
  const clock = useLocalClock()

  const [mode, speedStr] = speedKey.split(':')
  const speed = Number(speedStr)
  const realTime = mode === 'rt'
  const dateLabel = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  const setSpeed = (rt: boolean, v: number, toast: string) => {
    setRealTimeMode(rt)
    setTimeSpeed(v)
    showToast(toast)
  }

  const plusDay = () => {
    play('chime')
    mutateWorld((w) => advanceDay(w, useStudioStore.getState()))
    showToast('🌱 Advanced +24 Hours — plants grew lushly!')
  }

  return (
    <div className="flex shrink-0 items-center gap-1.5 rounded-xl border border-sand-border bg-sand-pale p-1">
      <div className="flex h-8 items-center gap-2 whitespace-nowrap rounded-lg border border-sand-track bg-white px-2.5 shadow-2xs">
        <span className="text-xs text-amber-500">{PHASE_ICONS[lighting]}</span>
        <span className="text-xs font-semibold text-forest-deep">{`${dateLabel} · Day ${Math.floor(dayCount)}`}</span>
        <span className="h-3.5 w-px bg-sand-border" />
        <span className="font-mono-clock text-xs font-semibold text-ink-bark">{clock}</span>
        <span className="hidden rounded bg-parchment px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink xl:inline-block">
          {PHASE_BADGES[lighting]}
        </span>
      </div>

      <button
        type="button"
        aria-pressed={realTime && speed === 1}
        title="Sync simulation speed with real-world time"
        onClick={() => setSpeed(true, 1, '🕒 Real-Time Biosphere sync active')}
        className={`${BTN} inline-flex items-center gap-1.5 px-2.5 ${realTime && speed === 1 ? ACTIVE : IDLE}`}
      >
        <svg
          className="h-3.5 w-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
        <span>Real-Time</span>
      </button>
      <button
        type="button"
        aria-label="Pause"
        aria-pressed={speed === 0}
        title="Pause Biological Loop"
        onClick={() => setSpeed(false, 0, '⏸️ Biological simulation paused')}
        className={`${BTN} inline-flex items-center justify-center px-2 ${speed === 0 ? ACTIVE : IDLE}`}
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="5" width="4" height="14" rx="1" />
          <rect x="14" y="5" width="4" height="14" rx="1" />
        </svg>
      </button>
      <button
        type="button"
        aria-pressed={!realTime && speed === 1}
        onClick={() => setSpeed(false, 1, '▶️ Standard 1× simulation speed')}
        className={`${BTN} inline-flex items-center justify-center px-2 ${!realTime && speed === 1 ? ACTIVE : IDLE}`}
      >
        1×
      </button>
      <button
        type="button"
        aria-pressed={speed === 5}
        onClick={() => setSpeed(false, 5, '⚡ Fast-Forward 5× growth & creature speed')}
        className={`${BTN} inline-flex items-center gap-0.5 px-2 ${speed === 5 ? ACTIVE : IDLE}`}
      >
        5×<span>⚡</span>
      </button>
      <button
        type="button"
        title="Advance Biosphere +24 Hours"
        onClick={plusDay}
        className="inline-flex h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border border-amber-glow/30 bg-amber-pale px-2.5 text-xs font-semibold text-amber-brown transition hover:bg-amber-soft"
      >
        +1 Day
      </button>
    </div>
  )
}
