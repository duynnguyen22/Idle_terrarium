import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { useId, useRef, useState } from 'react'
import {
  ExitRelaxButton,
  LightChoices,
  SoundMenu,
  SoundMenuTrigger,
  VolumeControls,
} from '@/components/stage/RelaxDockControls'
import { useSoundMenuDismiss } from '@/components/stage/useSoundMenuDismiss'
import { LineIcon } from '@/components/ui/LineIcon'
import { Separator } from '@/components/ui/separator'
import { SOUND_PRESETS } from '@/data/soundPresets'
import type { LightingId } from '@/data/types'
import {
  autoLightSyncAtom,
  lightingAtom,
  musicVolumeAtom,
  relaxModeAtom,
  soundPresetAtom,
} from '@/store/studio'

const Divider = () => (
  <Separator orientation="vertical" className="hidden h-6 self-center bg-white/10 sm:block" />
)

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

  useSoundMenuDismiss(menuOpen, setMenuOpen, dockRef, triggerRef)

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
        <SoundMenuTrigger
          triggerRef={triggerRef}
          menuOpen={menuOpen}
          menuId={menuId}
          label={current.label}
          onToggle={() => setMenuOpen((o) => !o)}
        />

        {menuOpen && (
          <SoundMenu
            menuId={menuId}
            musicVolume={musicVolume}
            changeVolume={changeVolume}
            soundPreset={soundPreset}
            setSoundPreset={setSoundPreset}
          />
        )}
      </div>

      <VolumeControls
        muted={muted}
        toggleMute={toggleMute}
        musicVolume={musicVolume}
        changeVolume={changeVolume}
      />
      <Divider />

      <LightChoices value={autoLight ? 'auto' : lighting} onValueChange={chooseLight} />
      <Divider />

      <ExitRelaxButton onExit={() => setRelaxMode(false)} />
    </div>
  )
}
