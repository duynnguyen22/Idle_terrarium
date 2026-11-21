import { cn } from 'cn'
import { useAtomValue } from 'jotai'
import type { RefObject } from 'react'
import { Button } from '@/components/ui/button'
import { LineIcon } from '@/components/ui/LineIcon'
import type { IconName } from '@/components/ui/lineIconPaths'
import { Slider } from '@/components/ui/slider'
import { Toggle } from '@/components/ui/toggle'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { SOUND_PRESETS, type SoundPreset } from '@/data/soundPresets'
import type { LightingId } from '@/data/types'
import { layoutModeAtom } from '@/store/layout'

const LIGHTS: { id: LightingId; icon: IconName; label: string }[] = [
  { id: 'dawn', icon: 'sunrise', label: 'Misty dawn' },
  { id: 'sunlight', icon: 'sun', label: 'Sun shower' },
  { id: 'twilight', icon: 'sunset', label: 'Golden hour' },
  { id: 'night', icon: 'moon', label: 'Moonlight' },
]

const SOUND_GROUPS: { kind: SoundPreset['kind']; label: string }[] = [
  { kind: 'nature', label: 'Nature' },
  { kind: 'music', label: 'Music' },
]

/** Round icon button used for the light choices, mute and exit. */
const ICON_BTN =
  'h-8 w-7 min-w-0 shrink-0 rounded-full px-0 text-white/65 transition-colors duration-150 hover:bg-white/10 hover:text-white active:bg-white/15 sm:w-8'
/** The phone icon button: 40 px square. */
const ICON_BTN_PHONE =
  'size-10 min-w-0 shrink-0 rounded-full px-0 text-white/65 transition-colors duration-150 hover:bg-white/10 hover:text-white active:bg-white/15'
const ON =
  'data-[state=on]:bg-sage data-[state=on]:text-forest-night data-[state=on]:hover:bg-sage data-[state=on]:hover:text-forest-night'

function VolumeSlider({
  volume,
  onChange,
  className = '',
}: {
  volume: number
  onChange: (v: number) => void
  className?: string
}) {
  const pct = Math.round(volume * 100)
  return (
    <Slider
      min={0}
      max={100}
      step={5}
      value={[pct]}
      onValueChange={([v]) => onChange(v! / 100)}
      aria-label="Music volume"
      aria-valuetext={`${pct}%`}
      title={`Volume ${pct}%`}
      size="sm"
      className={className}
    />
  )
}

/** The button that opens the sound menu, showing the playing sound. */
export function SoundMenuTrigger({
  triggerRef,
  menuOpen,
  menuId,
  label,
  onToggle,
}: {
  triggerRef: RefObject<HTMLButtonElement | null>
  menuOpen: boolean
  menuId: string
  label: string
  onToggle: () => void
}) {
  const phone = useAtomValue(layoutModeAtom) === 'phone'
  return (
    <Button
      ref={triggerRef}
      variant="ghost"
      aria-haspopup="true"
      aria-expanded={menuOpen}
      aria-controls={menuId}
      onClick={onToggle}
      className={
        phone
          ? '-ml-2 h-auto min-h-11 max-w-full min-w-0 gap-2 rounded-full px-2 py-1 text-left font-normal text-white transition-colors duration-150 hover:bg-white/10 hover:text-white aria-expanded:bg-white/15 aria-expanded:text-white'
          : 'h-10 max-w-28 gap-1.5 rounded-full pr-2.5 pl-3.5 text-left font-normal text-white transition-colors duration-150 hover:bg-white/10 hover:text-white aria-expanded:bg-white/15 aria-expanded:text-white sm:max-w-none sm:gap-2 sm:pr-3 sm:pl-4'
      }
    >
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="text-[11px] text-white/50">Sound</span>
        <span className="truncate text-[13px] font-medium">{label}</span>
      </span>
      <LineIcon
        name="chevronUp"
        className={cn(
          'size-3.5 text-white/50 transition-transform duration-200',
          !menuOpen && 'rotate-180',
        )}
      />
    </Button>
  )
}

/** The sound menu: a volume slider on phones, then the nature and music sounds. */
export function SoundMenu({
  menuId,
  musicVolume,
  changeVolume,
  soundPreset,
  setSoundPreset,
}: {
  menuId: string
  musicVolume: number
  changeVolume: (v: number) => void
  soundPreset: SoundPreset['id']
  setSoundPreset: (id: SoundPreset['id']) => void
}) {
  const phone = useAtomValue(layoutModeAtom) === 'phone'
  return (
    <div
      id={menuId}
      className={cn(
        'absolute bottom-full mb-3 w-72 rounded-3xl bg-forest-deep p-2 shadow-[0_20px_48px_-16px_rgba(0,0,0,0.6)]',
        phone ? '-left-1.5' : 'left-0',
      )}
    >
      {/* On a phone the volume range sits in the dock itself. */}
      {!phone && (
        <div className="flex items-center gap-3 px-3 pb-2 pt-2 sm:hidden">
          <LineIcon name="vol" className="h-4 w-4 text-white/60" />
          <VolumeSlider volume={musicVolume} onChange={changeVolume} className="flex-1" />
        </div>
      )}
      {SOUND_GROUPS.map((g) => (
        <div key={g.kind} className="py-1">
          <p className="px-3 pt-2 pb-1 text-xs text-white/50">{g.label}</p>
          <ToggleGroup
            type="single"
            orientation="vertical"
            spacing={0}
            size="auto"
            aria-label={`${g.label} sounds`}
            value={soundPreset}
            // Pressing the playing sound again sends '': keep it.
            onValueChange={(id) => id && setSoundPreset(id as SoundPreset['id'])}
            className="w-full flex-col items-stretch"
          >
            {SOUND_PRESETS.filter((p) => p.kind === g.kind).map((p) => {
              const active = p.id === soundPreset
              return (
                <ToggleGroupItem
                  key={p.id}
                  value={p.id}
                  data-sound={p.id}
                  className="w-full justify-start gap-3 rounded-2xl! px-3! py-2 text-left font-normal text-white transition-colors duration-150 hover:bg-white/5 hover:text-white data-[state=on]:bg-white/10 data-[state=on]:hover:bg-white/10"
                >
                  <span className="flex min-w-0 flex-1 flex-col leading-snug">
                    <span className={cn('text-sm', active ? 'font-semibold' : 'text-white/85')}>
                      {p.label}
                    </span>
                    <span className="text-xs text-white/50">{p.hint}</span>
                  </span>
                  {active && <LineIcon name="check" className="size-4 text-sage" />}
                </ToggleGroupItem>
              )
            })}
          </ToggleGroup>
        </div>
      ))}
    </div>
  )
}

/** Mute and, from the small breakpoint up, the volume slider. */
export function VolumeControls({
  muted,
  toggleMute,
  musicVolume,
  changeVolume,
}: {
  muted: boolean
  toggleMute: () => void
  musicVolume: number
  changeVolume: (v: number) => void
}) {
  const phone = useAtomValue(layoutModeAtom) === 'phone'
  return (
    <div
      className={phone ? 'flex flex-none items-center gap-1' : 'flex items-center gap-1 sm:pr-2'}
    >
      <Toggle
        pressed={muted}
        onPressedChange={toggleMute}
        aria-label={muted ? 'Unmute music' : 'Mute music'}
        title={muted ? 'Unmute' : 'Mute'}
        className={cn(phone ? ICON_BTN_PHONE : ICON_BTN, 'aria-pressed:bg-transparent')}
      >
        <LineIcon name={muted ? 'mute' : 'vol'} />
      </Toggle>
      <VolumeSlider
        volume={musicVolume}
        onChange={changeVolume}
        className={phone ? 'flex w-[104px]' : 'hidden w-24 sm:flex'}
      />
    </div>
  )
}

/** The four lights and "Follow my clock". */
export function LightChoices({
  value,
  onValueChange,
}: {
  value: string
  onValueChange: (id: string) => void
}) {
  const phone = useAtomValue(layoutModeAtom) === 'phone'
  const btn = phone ? ICON_BTN_PHONE : ICON_BTN
  return (
    <ToggleGroup
      type="single"
      spacing={0.5}
      aria-label="Light"
      value={value}
      onValueChange={onValueChange}
      className={phone ? '-ml-1.5 flex-auto gap-0.5 max-[400px]:gap-0' : undefined}
    >
      {LIGHTS.map((l) => (
        <ToggleGroupItem
          key={l.id}
          value={l.id}
          aria-label={l.label}
          title={l.label}
          data-weather={l.id}
          className={cn(btn, ON)}
        >
          <LineIcon name={l.icon} />
        </ToggleGroupItem>
      ))}
      <ToggleGroupItem
        value="auto"
        aria-label="Follow my clock"
        title="Follow my clock"
        className={cn(btn, ON, phone && 'ml-1')}
      >
        <LineIcon name="auto" />
      </ToggleGroupItem>
    </ToggleGroup>
  )
}

/** Leaves relax mode. */
export function ExitRelaxButton({ onExit }: { onExit: () => void }) {
  const phone = useAtomValue(layoutModeAtom) === 'phone'
  if (phone) {
    return (
      <Button
        variant="ghost"
        onClick={onExit}
        aria-label="Exit relax mode"
        title="Exit"
        className="h-10 min-w-16 flex-none rounded-full bg-[#f2f5f1] px-3.5 text-sm leading-none font-semibold text-[#16271e] hover:bg-[#f2f5f1] hover:text-[#16271e] max-[400px]:min-w-0 max-[400px]:px-[11px] max-[400px]:text-[13px]"
      >
        Exit
      </Button>
    )
  }
  return (
    <Button
      variant="ghost"
      onClick={onExit}
      aria-label="Exit relax mode"
      title="Exit (Esc)"
      className="h-10 gap-2 rounded-full px-2.5 text-[13px] font-medium text-white/80 transition-colors duration-150 hover:bg-white/10 hover:text-white sm:px-4"
    >
      <LineIcon name="close" className="size-4 sm:hidden" />
      <span className="hidden sm:inline">Exit</span>
      <span className="hidden text-xs text-white/40 sm:inline">Esc</span>
    </Button>
  )
}
