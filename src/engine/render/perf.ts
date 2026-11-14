import type { ViewState } from '@/engine/view'

/**
 * Frame-time sampling and adaptive drawing resolution (prototype `perfTick`, v9 8086). `sampleFrame`
 * measures; `perfStep` moves `view.renderScale` through `RENDER_STEPS` when frames run slow or fast.
 */

export interface PerfState {
  /** Exponential average of the frame time, ms. */
  ema: number
  /** rAF timestamp of the previous frame; 0 before the first. */
  last: number
  /** The last 90 frame times, ms. */
  dts: number[]
  slow: number
  fast: number
  lockUp: number
  lockAll: number
  lastRaise: number
  trial: { scale: number; ema: number; n: number } | null
}

const KEEP = 90
/** A longer gap is a backgrounded tab or a breakpoint, not a slow frame. */
const MAX_DT = 250

/** Fractions of the full backing-store resolution, highest first (prototype 8084). */
export const RENDER_STEPS = [1, 0.85, 0.72, 0.6] as const

const SLOW_MS = 21
const FAST_MS = 17.4
const SLOW_FRAMES = 90
const FAST_FRAMES = 480
const TRIAL_FRAMES = 120
/** A trial must cut the average frame time by at least 8 %. */
const TRIAL_GAIN = 0.92
const LOCK_ALL_MS = 300_000
const RAISE_WINDOW_MS = 20_000
const LOCK_UP_MS = 120_000

export function createPerf(): PerfState {
  return {
    ema: 16.7,
    last: 0,
    dts: [],
    slow: 0,
    fast: 0,
    lockUp: 0,
    lockAll: 0,
    lastRaise: -1e9,
    trial: null,
  }
}

/** Records the frame at `ts`; returns its dt, or null when the sample is ignored. */
export function sampleFrame(p: PerfState, ts: number): number | null {
  const first = p.last === 0
  const dt = ts - p.last
  p.last = ts
  if (first || !(dt > 0) || dt > MAX_DT) return null
  p.ema = p.ema * 0.94 + dt * 0.06
  p.dts.push(dt)
  if (p.dts.length > KEEP) p.dts.shift()
  return dt
}

export function perfSummary(p: PerfState): { fps: number; slowest: number } | null {
  const d = p.dts
  if (!d.length) return null
  let sum = 0
  let max = 0
  for (const v of d) {
    sum += v
    if (v > max) max = v
  }
  return { fps: Math.round(1000 / (sum / d.length)), slowest: Math.round(max) }
}

/**
 * Steps `view.renderScale` for the frame at `ts` (prototype `perfTick` 8094-8115). Call it after a
 * `sampleFrame` that kept its sample. With smooth drawing off the resolution is pinned to full.
 */
export function perfStep(p: PerfState, view: ViewState, ts: number): void {
  if (!view.fastDraw) {
    view.renderScale = 1
    p.trial = null
    return
  }
  // After lowering the resolution, check that it actually helped; if not, something else is the limit.
  if (p.trial) {
    if (++p.trial.n >= TRIAL_FRAMES) {
      if (p.ema > p.trial.ema * TRIAL_GAIN) {
        view.renderScale = p.trial.scale
        p.lockAll = ts + LOCK_ALL_MS
      }
      p.trial = null
      p.slow = 0
      p.fast = 0
    }
    return
  }
  if (ts < p.lockAll) return
  const steps: readonly number[] = RENDER_STEPS
  const i = steps.indexOf(view.renderScale)
  if (p.ema > SLOW_MS) {
    p.slow++
    p.fast = 0
  } else if (p.ema < FAST_MS) {
    p.fast++
    p.slow = 0
  } else {
    p.slow = 0
    p.fast = 0
  }
  if (p.slow > SLOW_FRAMES && i < steps.length - 1) {
    p.trial = { scale: view.renderScale, ema: p.ema, n: 0 }
    view.renderScale = steps[i + 1]!
    p.slow = 0
    // It just went up and dropped again: stay down for a while.
    if (ts - p.lastRaise < RAISE_WINDOW_MS) p.lockUp = ts + LOCK_UP_MS
  } else if (p.fast > FAST_FRAMES && i > 0 && ts > p.lockUp) {
    view.renderScale = steps[i - 1]!
    p.fast = 0
    p.lastRaise = ts
  }
}
