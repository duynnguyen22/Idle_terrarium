import { LineIcon, type IconName } from '@/components/ui/LineIcon'
import type { LightingId } from '@/data/types'
import { useLocalClock } from '@/hooks/useLocalClock'
import { plusOneDay } from '@/store/awayFlow'
import { selectDayCount, selectLighting } from '@/store/selectors'
import { showToast } from '@/store/toastStore'
import { useStudioStore } from '@/store/useStudioStore'

const PHASE_ICONS: Record<LightingId, IconName> = {
  dawn: 'sunrise',
  sunlight: 'sun',
  twilight: 'sunset',
  night: 'moon',
}

const PHASE_BADGES: Record<LightingId, string> = {
  dawn: 'Dawn · dew on the glass',
  sunlight: 'Day · photosynthesis',
  twilight: 'Dusk · lamp winding down',
  night: 'Night · respiration',
}

const BTN = 'h-8 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition'
const ACTIVE = 'bg-forest-deep text-white'
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

  const plusDay = () => showToast(plusOneDay())

  return (
    <div className="flex shrink-0 items-center gap-1.5 rounded-xl bg-sand-pale p-1">
      <div className="flex h-8 items-center gap-2 whitespace-nowrap rounded-lg bg-white px-2.5">
        <span className="inline-flex text-[#b7791f]">
          <LineIcon name={PHASE_ICONS[lighting]} />
        </span>
        <span className="text-xs font-semibold text-forest-deep">{`${dateLabel} · Day ${Math.floor(dayCount)}`}</span>
        <span className="h-3.5 w-px bg-sand-border" />
        <span className="font-mono-clock text-xs font-semibold text-ink-bark">{clock}</span>
        <span className="hidden text-[11px] text-stone 2xl:inline">{PHASE_BADGES[lighting]}</span>
      </div>

      <button
        type="button"
        aria-pressed={realTime && speed === 1}
        aria-label="Real-time"
        title="Run at real-world speed"
        onClick={() => setSpeed(true, 1, 'Running at real-world speed')}
        className={`${BTN} inline-flex items-center gap-1.5 px-2.5 ${realTime && speed === 1 ? ACTIVE : IDLE}`}
      >
        <svg
          className="h-3.5 w-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
        <span className="hidden lg:inline">Real-time</span>
      </button>
      <button
        type="button"
        aria-label="Pause"
        aria-pressed={speed === 0}
        title="Pause"
        onClick={() => setSpeed(false, 0, 'Simulation paused')}
        className={`${BTN} inline-flex items-center justify-center px-2 ${speed === 0 ? ACTIVE : IDLE}`}
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <rect x="6" y="5" width="4" height="14" rx="1" />
          <rect x="14" y="5" width="4" height="14" rx="1" />
        </svg>
      </button>
      <button
        type="button"
        aria-pressed={!realTime && speed === 1}
        onClick={() => setSpeed(false, 1, 'Standard 1× speed')}
        className={`${BTN} inline-flex items-center justify-center px-2 ${!realTime && speed === 1 ? ACTIVE : IDLE}`}
      >
        1×
      </button>
      <button
        type="button"
        aria-pressed={speed === 5}
        onClick={() => setSpeed(false, 5, 'Fast-forward: 5× growth and creature speed')}
        className={`${BTN} inline-flex items-center px-2 ${speed === 5 ? ACTIVE : IDLE}`}
      >
        5×
      </button>
      <button
        type="button"
        title="Advance the biosphere by 24 hours"
        onClick={plusDay}
        className="inline-flex h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-lg bg-wheat px-2.5 text-xs font-semibold text-wheat-ink transition hover:bg-wheat-hover"
      >
        +1 day
      </button>
    </div>
  )
}
