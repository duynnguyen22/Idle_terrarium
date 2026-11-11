import { describe, expect, it } from 'vitest'
import {
  dtDayForFrame,
  MAX_FRAME_MS,
  PACE_LABELS,
  PACE_SUBTITLES,
  PACES,
  paceMs,
} from '@/engine/simulation/pace'

describe('pace table', () => {
  it('garden pace is 2 hours per tank day', () => expect(paceMs('garden')).toBe(2 * 36e5))

  it('lists every pace in ms per tank day, brisk to real life', () => {
    expect(PACES).toEqual({ brisk: 30 * 60e3, garden: 2 * 36e5, calm: 6 * 36e5, real: 864e5 })
  })

  it('labels and subtitles every pace', () => {
    expect(PACE_LABELS).toEqual({
      brisk: 'Brisk',
      garden: 'Garden',
      calm: 'Calm',
      real: 'Real life',
    })
    expect(PACE_SUBTITLES.garden).toBe('1 tank day = 2 h')
    expect(Object.keys(PACE_SUBTITLES).sort()).toEqual(Object.keys(PACES).sort())
  })

  it('dtDayForFrame caps the frame at 250 ms and scales 5x', () => {
    expect(MAX_FRAME_MS).toBe(250)
    expect(dtDayForFrame(1000, 1, 'garden')).toBeCloseTo(250 / (2 * 36e5))
    expect(dtDayForFrame(100, 5, 'brisk')).toBeCloseTo(500 / (30 * 60e3))
    expect(dtDayForFrame(100, 0, 'garden')).toBe(0)
  })
})
