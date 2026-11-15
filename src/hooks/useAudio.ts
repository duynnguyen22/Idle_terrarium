import { useAtomValue } from 'jotai'
import { useEffect, useState } from 'react'
import { ensureAmbient, play, setAmbientVolume, stopAmbient } from '@/services/audio'
import { audioEnabledAtom, musicVolumeAtom, soundPresetAtom } from '@/store/studio'

/**
 * Mount once (StudioLayout). Keeps the ambient soundscape in step with `audioEnabled` / `soundPreset` / `musicVolume`
 * (restarting on preset change). The gesture handlers in `@/services/audio` start it synchronously; this effect covers later
 * changes. Ambient never starts from here before the first user gesture (pointerdown/keydown), because a
 * persisted `audioEnabled: true` on reload must not create an AudioContext without one.
 */
export function useAudio(): { play: typeof play } {
  const audioEnabled = useAtomValue(audioEnabledAtom)
  const soundPreset = useAtomValue(soundPresetAtom)
  const musicVolume = useAtomValue(musicVolumeAtom)
  const [unlocked, setUnlocked] = useState(false)

  useEffect(() => {
    if (unlocked) return
    const unlock = () => setUnlocked(true)
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [unlocked])

  useEffect(() => {
    if (!audioEnabled) stopAmbient()
    else if (unlocked) ensureAmbient(soundPreset)
  }, [audioEnabled, soundPreset, unlocked])

  useEffect(() => setAmbientVolume(musicVolume), [musicVolume])

  useEffect(() => stopAmbient, [])

  return { play }
}
