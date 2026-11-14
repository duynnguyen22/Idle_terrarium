/**
 * Frame-time sampling for the frame-rate readout (prototype `perfTick`, v9 8086). The resolution
 * steps that read this state arrive later; for now it only measures.
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
