import { atom, useAtomValue, useSetAtom } from 'jotai'
import { ClockIcon, PauseIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { LineIcon, type IconName } from '@/components/ui/LineIcon'
import { Separator } from '@/components/ui/separator'
import type { LightingId } from '@/data/types'
import { useLocalClock } from '@/hooks/useLocalClock'
import { plusOneDay } from '@/store/awayFlow'
import { dayCountAtom, lightingAtom, realTimeModeAtom, timeSpeedAtom } from '@/store/studio'
import { showToast } from '@/store/toast'

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

type SpeedId = 'rt' | 'pause' | '1x' | '5x'

const SPEEDS: Record<SpeedId, { rt: boolean; v: number; toast: string }> = {
  rt: { rt: true, v: 1, toast: 'Running at real-world speed' },
  pause: { rt: false, v: 0, toast: 'Simulation paused' },
  '1x': { rt: false, v: 1, toast: 'Standard 1× speed' },
  '5x': { rt: false, v: 5, toast: 'Fast-forward: 5× growth and creature speed' },
}

const ITEM = 'text-xs font-semibold'
/** Compact items (pause, 1×, 5×) keep the old tight padding so the nav fits at 900 px. */
const COMPACT = `${ITEM} min-w-0 px-2`

const speedKeyAtom = atom((get) => `${get(realTimeModeAtom) ? 'rt' : 'm'}:${get(timeSpeedAtom)}`)

export function ClockSpeedPill() {
  const lighting = useAtomValue(lightingAtom)
  const dayCount = useAtomValue(dayCountAtom)
  const speedKey = useAtomValue(speedKeyAtom)
  const setTimeSpeed = useSetAtom(timeSpeedAtom)
  const setRealTimeMode = useSetAtom(realTimeModeAtom)
  const clock = useLocalClock()

  const [mode, speedStr] = speedKey.split(':')
  const speed = Number(speedStr)
  const realTime = mode === 'rt'
  const dateLabel = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  const active: SpeedId | '' =
    speed === 0 ? 'pause' : speed === 5 ? '5x' : speed === 1 ? (realTime ? 'rt' : '1x') : ''

  const setSpeed = (id: string) => {
    const next = SPEEDS[id as SpeedId]
    if (!next) return // pressing the active item again keeps it selected
    setRealTimeMode(next.rt)
    setTimeSpeed(next.v)
    showToast(next.toast)
  }

  const plusDay = () => showToast(plusOneDay())

  return (
    <div className="flex shrink-0 items-center gap-1.5 rounded-xl bg-sand-pale p-1">
      <div className="flex h-8 items-center gap-2 whitespace-nowrap rounded-lg bg-white px-2.5">
        <span className="inline-flex text-[#b7791f]">
          <LineIcon name={PHASE_ICONS[lighting]} />
        </span>
        <span className="text-xs font-semibold text-forest-deep">{`${dateLabel} · Day ${Math.floor(dayCount)}`}</span>
        <Separator orientation="vertical" className="h-3.5" />
        <span className="font-mono-clock text-xs font-semibold text-ink-bark">{clock}</span>
        <span className="hidden text-[11px] text-stone 2xl:inline">{PHASE_BADGES[lighting]}</span>
      </div>

      <ToggleGroup
        type="single"
        variant="solid"
        spacing={1.5}
        aria-label="Simulation speed"
        value={active}
        onValueChange={setSpeed}
      >
        <ToggleGroupItem
          value="rt"
          aria-label="Real-time"
          title="Run at real-world speed"
          className={ITEM}
        >
          <ClockIcon data-icon="inline-start" className="size-3.5" />
          <span className="hidden lg:inline">Real-time</span>
        </ToggleGroupItem>
        <ToggleGroupItem value="pause" aria-label="Pause" title="Pause" className={COMPACT}>
          <PauseIcon className="size-3.5 fill-current" />
        </ToggleGroupItem>
        <ToggleGroupItem value="1x" className={COMPACT}>
          1×
        </ToggleGroupItem>
        <ToggleGroupItem value="5x" className={COMPACT}>
          5×
        </ToggleGroupItem>
      </ToggleGroup>
      <Button
        variant="wheat"
        title="Advance the biosphere by 24 hours"
        onClick={plusDay}
        className="text-xs font-semibold"
      >
        +1 day
      </Button>
    </div>
  )
}
