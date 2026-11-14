import { describe, expect, it } from 'vitest'
import {
  createPerf,
  perfStep,
  perfSummary,
  RENDER_STEPS,
  sampleFrame,
  type PerfState,
} from '@/engine/render/perf'
import { createView, type ViewState } from '@/engine/view'

describe('perf sampling', () => {
  it('ignores a first frame, a zero dt and a gap over 250 ms', () => {
    const p = createPerf()
    expect(sampleFrame(p, 100)).toBeNull()
    expect(sampleFrame(p, 100)).toBeNull()
    expect(sampleFrame(p, 400)).toBeNull()
    expect(p.dts).toEqual([])
    expect(p.ema).toBe(16.7)
    expect(sampleFrame(p, 420)).toBe(20)
    expect(p.dts).toEqual([20])
  })

  it('ema moves 6 % toward each sample and dts keeps the last 90', () => {
    const p = createPerf()
    let ts = 1000
    sampleFrame(p, ts)
    ts += 26.7
    sampleFrame(p, ts)
    expect(p.ema).toBeCloseTo(16.7 * 0.94 + 26.7 * 0.06, 6)
    for (let i = 0; i < 120; i++) {
      ts += 10 + (i % 5)
      sampleFrame(p, ts)
    }
    expect(p.dts).toHaveLength(90)
    // The oldest kept sample is loop frame i = 30: 10 + 0.
    expect(p.dts[0]).toBeCloseTo(10, 6)
  })

  it('perfSummary reports fps from the mean and the slowest frame', () => {
    const p = createPerf()
    expect(perfSummary(p)).toBeNull()
    let ts = 1000
    sampleFrame(p, ts)
    for (let i = 0; i < 10; i++) sampleFrame(p, (ts += 20))
    expect(perfSummary(p)).toEqual({ fps: 50, slowest: 20 })
    sampleFrame(p, (ts += 45))
    expect(perfSummary(p)?.slowest).toBe(45)
  })

  it('createPerf starts at 16.7 ms with no raise on record', () => {
    const p = createPerf()
    expect(p.ema).toBe(16.7)
    expect(p.lastRaise).toBe(-1e9)
    expect(p.trial).toBeNull()
  })
})

describe('perfStep (adaptive resolution)', () => {
  /** A perf state already averaging `ema` ms, with the previous frame at `ts`. */
  function primed(ema: number, ts: number) {
    const p = createPerf()
    p.ema = ema
    p.last = ts
    return p
  }

  /** Runs `n` frames `dt` ms apart, stepping only on frames sampleFrame keeps (as the hook does). */
  function frames(p: PerfState, view: ViewState, n: number, dt: number) {
    let ts = p.last
    for (let k = 0; k < n; k++) {
      ts += dt
      if (sampleFrame(p, ts) !== null) perfStep(p, view, ts)
    }
    return ts
  }

  it('RENDER_STEPS are 1, 0.85, 0.72 and 0.6', () => {
    expect(RENDER_STEPS).toEqual([1, 0.85, 0.72, 0.6])
  })

  it('steps down after 90 slow frames and starts a trial', () => {
    const view = createView()
    const p = primed(30, 10_000)
    frames(p, view, 90, 30)
    expect(view.renderScale).toBe(1)
    expect(p.trial).toBeNull()
    frames(p, view, 1, 30)
    expect(view.renderScale).toBe(0.85)
    expect(p.trial).toMatchObject({ scale: 1, n: 0 })
    expect(p.trial?.ema).toBeCloseTo(30, 6)
    expect(p.slow).toBe(0)
  })

  it('a trial that does not help by 8 % goes back and locks for 5 minutes', () => {
    const view = createView()
    const p = primed(30, 10_000)
    frames(p, view, 91, 30)
    expect(view.renderScale).toBe(0.85)
    // Still 30 ms a frame: the lower resolution did not help.
    frames(p, view, 119, 30)
    expect(view.renderScale).toBe(0.85)
    const ts = frames(p, view, 1, 30)
    expect(view.renderScale).toBe(1)
    expect(p.trial).toBeNull()
    expect(p.lockAll).toBe(ts + 300_000)
    // Slow for almost 5 minutes: no step at all.
    frames(p, view, Math.floor(300_000 / 30) - 1, 30)
    expect(view.renderScale).toBe(1)
    // The lock ends: 91 slow frames step down again.
    frames(p, view, 92, 30)
    expect(view.renderScale).toBe(0.85)
  })

  it('a trial that helps by 8 % keeps the lower resolution', () => {
    const view = createView()
    const p = primed(30, 10_000)
    frames(p, view, 91, 30)
    frames(p, view, 120, 20)
    expect(view.renderScale).toBe(0.85)
    expect(p.trial).toBeNull()
    expect(p.lockAll).toBe(0)
  })

  it('steps up after 480 fast frames', () => {
    const view = createView()
    view.renderScale = 0.72
    const p = primed(15, 10_000)
    frames(p, view, 480, 15)
    expect(view.renderScale).toBe(0.72)
    const ts = frames(p, view, 1, 15)
    expect(view.renderScale).toBe(0.85)
    expect(p.lastRaise).toBe(ts)
    expect(p.fast).toBe(0)
  })

  it('a raise that falls again within 20 s stays down for 2 minutes', () => {
    const view = createView()
    view.renderScale = 0.85
    const p = primed(15, 10_000)
    frames(p, view, 481, 15)
    expect(view.renderScale).toBe(1)
    // Slow again a few seconds later.
    p.ema = 30
    const down = frames(p, view, 91, 30)
    expect(view.renderScale).toBe(0.85)
    expect(p.lockUp).toBe(down + 120_000)
    // The trial helps, then frames are fast but the raise waits out the lock.
    p.ema = 15
    frames(p, view, 120, 15)
    expect(view.renderScale).toBe(0.85)
    const untilLock = Math.floor((p.lockUp - p.last) / 15)
    frames(p, view, untilLock, 15)
    expect(p.last).toBeLessThanOrEqual(p.lockUp)
    expect(view.renderScale).toBe(0.85)
    frames(p, view, 2, 15)
    expect(view.renderScale).toBe(1)
  })

  it('smooth drawing off pins renderScale to 1', () => {
    const view = createView()
    view.renderScale = 0.6
    view.fastDraw = false
    const p = primed(30, 10_000)
    p.trial = { scale: 0.72, ema: 30, n: 50 }
    frames(p, view, 1, 30)
    expect(view.renderScale).toBe(1)
    expect(p.trial).toBeNull()
    // Slow frames never step down while it is off.
    frames(p, view, 200, 30)
    expect(view.renderScale).toBe(1)
  })
})
