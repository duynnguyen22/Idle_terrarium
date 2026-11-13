import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { cn } from 'cn'
import { useEffect, useId, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { LineIcon, type IconName } from '@/components/ui/LineIcon'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { Toggle } from '@/components/ui/toggle'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { SOUND_PRESETS, type SoundPreset } from '@/data/soundPresets'
import type { LightingId } from '@/data/types'
import {
  autoLightSyncAtom,
  lightingAtom,
  musicVolumeAtom,
  relaxModeAtom,
  soundPresetAtom,
} from '@/store/studio'

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
const ON =
  'data-[state=on]:bg-sage data-[state=on]:text-forest-night data-[state=on]:hover:bg-sage data-[state=on]:hover:text-forest-night'

const Divider = () => (
  <Separator orientation="vertical" className="hidden h-6 self-center bg-white/10 sm:block" />
)

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

/** The relax-mode control bar. Mounted only while relaxing, so the sound menu starts closed on every entry. */
export function RelaxDock() {
  const relaxMode = useAtomValue(relaxModeAtom)
  return relaxMode ? <Dock /> : null
}

function Dock() {
  const [soundPreset, setSoundPreset] = useAtom(soundPresetAtom)
  const lighting = useAtomValue(lightingAtom)
  const autoLight = useAtomValue(autoLightSyncAtom)
  const [musicVolume, setMusicVolume] = useAtom(musicVolumeAtom)
  const setLighting = useSetAtom(lightingAtom)
  const setAutoLightSync = useSetAtom(autoLightSyncAtom)
  const setRelaxMode = useSetAtom(relaxModeAtom)

  const [menuOpen, setMenuOpen] = useState(false)
  const lastVolume = useRef(musicVolume > 0 ? musicVolume : 0.5)
  const dockRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()

  // While the menu is open: Escape closes it (before the global handler can exit relax mode),
  // and a press anywhere outside the dock closes it.
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      setMenuOpen(false)
      triggerRef.current?.focus()
    }
    const onPointer = (e: PointerEvent) => {
      if (!dockRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey, { capture: true })
    window.addEventListener('pointerdown', onPointer)
    return () => {
      window.removeEventListener('keydown', onKey, { capture: true })
      window.removeEventListener('pointerdown', onPointer)
    }
  }, [menuOpen])

  const current = SOUND_PRESETS.find((p) => p.id === soundPreset) ?? SOUND_PRESETS[0]
  const muted = musicVolume <= 0

  const changeVolume = (v: number) => {
    if (v > 0) lastVolume.current = v
    setMusicVolume(v)
  }
  const toggleMute = () => setMusicVolume(muted ? lastVolume.current : 0)
  // ToggleGroup sends '' when the chosen light is pressed again: keep it.
  const chooseLight = (id: string) => {
    if (!id) return
    if (id === 'auto') {
      setAutoLightSync(true)
      return
    }
    setLighting(id as LightingId)
    setAutoLightSync(false)
  }

  return (
    <div
      id="relax-dock"
      ref={dockRef}
      data-menu-open={menuOpen || undefined}
      className="absolute bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 max-w-[calc(100vw-2rem)] rounded-full bg-forest-night/95 p-1.5 text-white shadow-[0_12px_32px_-12px_rgba(0,0,0,0.55)] sm:bottom-6 sm:gap-2"
    >
      <span className="hidden items-center gap-1.5 pl-2.5 pr-1 font-serif-title text-sm text-sage md:flex">
        <LineIcon name="leaf" />
        Sanctuary
      </span>
      <Divider />

      <div className="relative">
        <Button
          ref={triggerRef}
          variant="ghost"
          aria-haspopup="true"
          aria-expanded={menuOpen}
          aria-controls={menuId}
          onClick={() => setMenuOpen((o) => !o)}
          className="h-10 max-w-28 gap-1.5 rounded-full pr-2.5 pl-3.5 text-left font-normal text-white transition-colors duration-150 hover:bg-white/10 hover:text-white aria-expanded:bg-white/15 aria-expanded:text-white sm:max-w-none sm:gap-2 sm:pr-3 sm:pl-4"
        >
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="text-[11px] text-white/50">Sound</span>
            <span className="truncate text-[13px] font-medium">{current.label}</span>
          </span>
          <LineIcon
            name="chevronUp"
            className={cn(
              'size-3.5 text-white/50 transition-transform duration-200',
              !menuOpen && 'rotate-180',
            )}
          />
        </Button>

        {menuOpen && (
          <div
            id={menuId}
            className="absolute bottom-full left-0 mb-3 w-72 rounded-3xl bg-forest-deep p-2 shadow-[0_20px_48px_-16px_rgba(0,0,0,0.6)]"
          >
            <div className="flex items-center gap-3 px-3 pb-2 pt-2 sm:hidden">
              <LineIcon name="vol" className="h-4 w-4 text-white/60" />
              <VolumeSlider volume={musicVolume} onChange={changeVolume} className="flex-1" />
            </div>
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
                          <span
                            className={cn('text-sm', active ? 'font-semibold' : 'text-white/85')}
                          >
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
        )}
      </div>

      <div className="flex items-center gap-1 sm:pr-2">
        <Toggle
          pressed={muted}
          onPressedChange={toggleMute}
          aria-label={muted ? 'Unmute music' : 'Mute music'}
          title={muted ? 'Unmute' : 'Mute'}
          className={cn(ICON_BTN, 'aria-pressed:bg-transparent')}
        >
          <LineIcon name={muted ? 'mute' : 'vol'} />
        </Toggle>
        <VolumeSlider
          volume={musicVolume}
          onChange={changeVolume}
          className="hidden w-24 sm:flex"
        />
      </div>
      <Divider />

      <ToggleGroup
        type="single"
        spacing={0.5}
        aria-label="Light"
        value={autoLight ? 'auto' : lighting}
        onValueChange={chooseLight}
      >
        {LIGHTS.map((l) => (
          <ToggleGroupItem
            key={l.id}
            value={l.id}
            aria-label={l.label}
            title={l.label}
            data-weather={l.id}
            className={cn(ICON_BTN, ON)}
          >
            <LineIcon name={l.icon} />
          </ToggleGroupItem>
        ))}
        <ToggleGroupItem
          value="auto"
          aria-label="Follow my clock"
          title="Follow my clock"
          className={cn(ICON_BTN, ON)}
        >
          <LineIcon name="auto" />
        </ToggleGroupItem>
      </ToggleGroup>
      <Divider />

      <Button
        variant="ghost"
        onClick={() => setRelaxMode(false)}
        aria-label="Exit relax mode"
        title="Exit (Esc)"
        className="h-10 gap-2 rounded-full px-2.5 text-[13px] font-medium text-white/80 transition-colors duration-150 hover:bg-white/10 hover:text-white sm:px-4"
      >
        <LineIcon name="close" className="size-4 sm:hidden" />
        <span className="hidden sm:inline">Exit</span>
        <span className="hidden text-xs text-white/40 sm:inline">Esc</span>
      </Button>
    </div>
  )
}
