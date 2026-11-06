import type { AsmrCue } from '@/engine/interaction'
import type { AudioContextLike } from './audioContext'

interface Recipe {
  type: string
  /** Start frequency; a function lets a cue randomize it. */
  f0: (rng: () => number) => number
  /** Frequency ramp target: absolute Hz, or derived from the (possibly randomized) start frequency. */
  f1: number | ((f0: number) => number)
  gain: number
  /** Frequency ramp end (s) and gain ramp end (s); equal for every cue except chime (0.22 / 0.24). */
  fDur: number
  gDur: number
  stop: number
}

/** Oscillator recipes copied from prototype playTactileASMR (1611-1665). */
const RECIPES: Record<AsmrCue, Recipe | null> = {
  repot: {
    type: 'triangle',
    f0: () => 140,
    f1: 65,
    gain: 0.08,
    fDur: 0.09,
    gDur: 0.09,
    stop: 0.09,
  },
  prune: { type: 'sine', f0: () => 980, f1: 420, gain: 0.06, fDur: 0.05, gDur: 0.05, stop: 0.05 },
  chime: { type: 'sine', f0: () => 528, f1: 792, gain: 0.05, fDur: 0.22, gDur: 0.24, stop: 0.24 },
  scatter: {
    type: 'triangle',
    f0: (rng) => 220 + rng() * 480,
    f1: 85,
    gain: 0.035,
    fDur: 0.035,
    gDur: 0.04,
    stop: 0.04,
  },
  pour_water: {
    type: 'sine',
    f0: (rng) => 420 + rng() * 380,
    f1: (f) => f * 1.35,
    gain: 0.03,
    fDur: 0.055,
    gDur: 0.06,
    stop: 0.06,
  },
}

export const ASMR_CUES = Object.keys(RECIPES) as AsmrCue[]

/** Plays one short tactile cue through `ctx`. The enabled check lives in the caller (useAudio.play). */
export function playCue(
  ctx: AudioContextLike,
  cue: AsmrCue,
  rng: () => number = Math.random,
): void {
  const r = RECIPES[cue]
  if (!r) return
  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.type = r.type
  const f0 = r.f0(rng)
  osc.frequency.setValueAtTime(f0, now)
  osc.frequency.exponentialRampToValueAtTime(
    typeof r.f1 === 'function' ? r.f1(f0) : r.f1,
    now + r.fDur,
  )
  gain.gain.setValueAtTime(r.gain, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + r.gDur)
  osc.onended = () => {
    osc.disconnect()
    gain.disconnect()
  }
  osc.start(now)
  osc.stop(now + r.stop)
}
