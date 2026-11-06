import { useEffect, useState } from 'react'
import { startAmbient } from '@/engine/audio/ambient'
import { playCue } from '@/engine/audio/asmr'
import { ensureAudioContext } from '@/engine/audio/audioContext'
import type { AsmrCue } from '@/engine/interaction'
import { useStudioStore } from '@/store/useStudioStore'

/**
 * Plays a tactile cue; no-op while audio is disabled (prototype playTactileASMR guard).
 *
 * Module-level on purpose: non-hook call sites (canvas pointer handler, ClockSpeedPill, the engine tick callback)
 * import `play` directly instead of threading it through props or a context. It reads the store lazily.
 */
export function play(cue: AsmrCue): void {
  if (!useStudioStore.getState().audioEnabled) return
  const ctx = ensureAudioContext()
  if (ctx) playCue(ctx, cue)
}

/**
 * Mount once (StudioLayout). Runs the ambient soundscape while audio is enabled, restarting on preset change.
 * Ambient never starts before the first user gesture (pointerdown/keydown), because a persisted
 * `audioEnabled: true` on reload must not create an AudioContext without one.
 */
export function useAudio(): { play: typeof play } {
  const audioEnabled = useStudioStore((s) => s.audioEnabled)
  const soundPreset = useStudioStore((s) => s.soundPreset)
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
    if (!audioEnabled || !unlocked) return
    const ctx = ensureAudioContext()
    if (!ctx) return
    const handle = startAmbient(ctx, soundPreset)
    return () => handle.stop()
  }, [audioEnabled, soundPreset, unlocked])

  return { play }
}
