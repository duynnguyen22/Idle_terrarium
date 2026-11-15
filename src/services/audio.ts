import { startAmbient, type AmbientHandle } from '@/engine/audio/ambient'
import { playCue } from '@/engine/audio/asmr'
import { ensureAudioContext } from '@/engine/audio/audioContext'
import type { SoundPresetId } from '@/data/types'
import type { AsmrCue } from '@/engine/interaction'
import { appStore } from '@/store/appStore'
import { audioEnabledAtom, musicVolumeAtom, soundPresetAtom } from '@/store/studio'

/**
 * Plays a tactile cue; no-op while audio is disabled (prototype playTactileASMR guard).
 *
 * Module-level on purpose: non-hook call sites (canvas pointer handler, ClockSpeedPill, the engine tick callback)
 * import `play` directly instead of threading it through props or a context. It reads the store lazily.
 */
export function play(cue: AsmrCue): void {
  if (!appStore.get(audioEnabledAtom)) return
  const ctx = ensureAudioContext()
  if (ctx) playCue(ctx, cue)
}

let ambient: { handle: AmbientHandle; preset: SoundPresetId } | null = null

export function stopAmbient(): void {
  ambient?.handle.stop()
  ambient = null
}

/** Idempotent: runs the ambient loop for `preset`, restarting only when the preset changed. */
export function ensureAmbient(preset: SoundPresetId): void {
  if (ambient?.preset === preset) return
  stopAmbient()
  const ctx = ensureAudioContext()
  if (ctx) {
    const volume = appStore.get(musicVolumeAtom)
    ambient = { handle: startAmbient(ctx, preset, Math.random, volume), preset }
  }
}

/** Applies a volume change to the running loop, if any; never creates an AudioContext. */
export function setAmbientVolume(volume: number): void {
  ambient?.handle.setVolume(volume)
}

/**
 * Turns audio on and starts the ambient loop synchronously. Call it directly from the click / keydown handler
 * that enables audio (Safari only lets an AudioContext start inside the gesture's call stack, not from a later effect).
 */
export function startAudioFromGesture(): void {
  appStore.set(audioEnabledAtom, true)
  ensureAmbient(appStore.get(soundPresetAtom))
}

/** Turns audio off and stops the loop; never creates an AudioContext. */
export function stopAudio(): void {
  appStore.set(audioEnabledAtom, false)
  stopAmbient()
}
