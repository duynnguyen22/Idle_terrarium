import type { SoundPresetId } from '@/data/types'
import type { AudioContextLike, GainLike, OscillatorLike } from './audioContext'

export interface AmbientHandle {
  /** Clears the scheduler interval and disconnects every node still alive. */
  stop(): void
}

export const AMBIENT_INTERVAL_MS = 260
const FOREST_NOTES = [392, 440, 523.25, 587.33, 659.25]

/** One ambient grain per tick, copied from prototype startAmbientSoundscape (1667-1708). */
function grain(
  ctx: AudioContextLike,
  preset: SoundPresetId,
  rng: () => number,
  osc: OscillatorLike,
  gain: GainLike,
) {
  const now = ctx.currentTime
  if (preset === 'stream' || preset === 'rain') {
    osc.type = 'sine'
    const base = preset === 'stream' ? 680 + rng() * 520 : 900 + rng() * 600
    osc.frequency.setValueAtTime(base, now)
    osc.frequency.exponentialRampToValueAtTime(base * 1.25, now + 0.06)
    gain.gain.setValueAtTime(0.018, now)
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.07)
    osc.start(now)
    osc.stop(now + 0.07)
  } else if (preset === 'forest') {
    osc.type = 'sine'
    osc.frequency.setValueAtTime(FOREST_NOTES[Math.floor(rng() * FOREST_NOTES.length)], now)
    gain.gain.setValueAtTime(0.02, now)
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.35)
    osc.start(now)
    osc.stop(now + 0.35)
  } else {
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(3400 + rng() * 300, now)
    gain.gain.setValueAtTime(0.012, now)
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.05)
    osc.start(now)
    osc.stop(now + 0.05)
  }
}

export function startAmbient(
  ctx: AudioContextLike,
  preset: SoundPresetId,
  rng: () => number = Math.random,
): AmbientHandle {
  const live = new Set<{ osc: OscillatorLike; gain: GainLike }>()
  const timer = setInterval(() => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    const entry = { osc, gain }
    live.add(entry)
    osc.onended = () => {
      osc.disconnect()
      gain.disconnect()
      live.delete(entry)
    }
    grain(ctx, preset, rng, osc, gain)
  }, AMBIENT_INTERVAL_MS)

  return {
    stop() {
      clearInterval(timer)
      for (const { osc, gain } of live) {
        osc.onended = null
        osc.disconnect()
        gain.disconnect()
      }
      live.clear()
    },
  }
}
