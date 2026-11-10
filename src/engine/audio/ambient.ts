import type { SoundPresetId } from '@/data/types'
import type { AudioContextLike, GainLike, OscillatorLike } from './audioContext'

export interface AmbientHandle {
  /** Sets the loop's master volume (0 to 1); takes effect immediately, including on notes already ringing. */
  setVolume(volume: number): void
  /** Clears the scheduler interval and disconnects every node still alive. */
  stop(): void
}

export const AMBIENT_INTERVAL_MS = 260
/** Master gain at full volume. The default volume (0.5) gives a gain of 1, the original loudness. */
export const AMBIENT_MAX_GAIN = 2
export const DEFAULT_MUSIC_VOLUME = 0.5

const FOREST_NOTES = [392, 440, 523.25, 587.33, 659.25]
/** C major pentatonic, C4 to E5: any two notes sound fine together, so a random walk never clashes. */
const PIANO_NOTES = [261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25]
/** A slow lullaby arpeggio over C, Am, F, G, two octaves up so it reads as a music box. */
const MUSIC_BOX_NOTES = [
  1046.5, 1318.5, 1568, 1318.5, 880, 1046.5, 1318.5, 1046.5, 698.46, 880, 1046.5, 880, 783.99,
  987.77, 1174.66, 987.77,
]
const BOWL_NOTES = [130.81, 146.83, 174.61, 196, 220]

/** How many scheduler ticks pass between notes, per preset. Nature presets play a grain on every tick. */
const TICKS_PER_NOTE: Partial<Record<SoundPresetId, number>> = {
  piano: 4,
  musicbox: 2,
  bowls: 12,
}

const clamp01 = (v: number) =>
  Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : DEFAULT_MUSIC_VOLUME

/** A soft-attack note: rises to `peak` over `attack` seconds, then fades out over `decay` seconds. */
function note(
  ctx: AudioContextLike,
  osc: OscillatorLike,
  gain: GainLike,
  type: string,
  freq: number,
  peak: number,
  attack: number,
  decay: number,
) {
  const now = ctx.currentTime
  osc.type = type
  osc.frequency.setValueAtTime(freq, now)
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(peak, now + attack)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + attack + decay)
  osc.start(now)
  osc.stop(now + attack + decay)
}

/** Per-loop state for the musical presets, so melodies move step by step instead of jumping around. */
interface MelodyState {
  step: number
  pianoIndex: number
}

/** One ambient grain per tick. The nature presets are copied from prototype startAmbientSoundscape (1667-1708). */
function grain(
  ctx: AudioContextLike,
  preset: SoundPresetId,
  rng: () => number,
  osc: OscillatorLike,
  gain: GainLike,
  melody: MelodyState,
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
  } else if (preset === 'piano') {
    // Random walk of -2..+2 scale steps, reflected at the ends of the scale.
    const move = Math.floor(rng() * 5) - 2
    let i = melody.pianoIndex + move
    if (i < 0) i = -i
    if (i >= PIANO_NOTES.length) i = 2 * (PIANO_NOTES.length - 1) - i
    melody.pianoIndex = i
    note(ctx, osc, gain, 'triangle', PIANO_NOTES[i], 0.035, 0.02, 1.8)
  } else if (preset === 'musicbox') {
    const freq = MUSIC_BOX_NOTES[melody.step % MUSIC_BOX_NOTES.length]
    note(ctx, osc, gain, 'sine', freq, 0.022, 0.005, 0.9)
  } else if (preset === 'bowls') {
    const freq = BOWL_NOTES[Math.floor(rng() * BOWL_NOTES.length)]
    note(ctx, osc, gain, 'sine', freq, 0.06, 0.4, 4.5)
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
  volume: number = DEFAULT_MUSIC_VOLUME,
): AmbientHandle {
  const master = ctx.createGain()
  master.gain.setValueAtTime(clamp01(volume) * AMBIENT_MAX_GAIN, ctx.currentTime)
  master.connect(ctx.destination)

  const live = new Set<{ osc: OscillatorLike; gain: GainLike }>()
  const every = TICKS_PER_NOTE[preset] ?? 1
  const melody: MelodyState = { step: 0, pianoIndex: 2 }
  let tick = 0
  const timer = setInterval(() => {
    const due = tick % every === 0
    tick++
    if (!due) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(master)
    const entry = { osc, gain }
    live.add(entry)
    osc.onended = () => {
      osc.disconnect()
      gain.disconnect()
      live.delete(entry)
    }
    grain(ctx, preset, rng, osc, gain, melody)
    melody.step++
  }, AMBIENT_INTERVAL_MS)

  return {
    setVolume(v) {
      master.gain.setValueAtTime(clamp01(v) * AMBIENT_MAX_GAIN, ctx.currentTime)
    },
    stop() {
      clearInterval(timer)
      for (const { osc, gain } of live) {
        osc.onended = null
        osc.disconnect()
        gain.disconnect()
      }
      live.clear()
      master.disconnect()
    },
  }
}
