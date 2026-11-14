import { describe, expect, it } from 'vitest'
import { createPerf, perfSummary, sampleFrame } from '@/engine/render/perf'

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
