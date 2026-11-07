import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { startAmbient, AMBIENT_INTERVAL_MS } from '@/engine/audio/ambient'
import { ASMR_CUES, playCue } from '@/engine/audio/asmr'
import { ensureAudioContext, setAudioContextFactory } from '@/engine/audio/audioContext'
import type { SoundPresetId } from '@/data/types'
import { createFakeAudio } from '../helpers/fakeAudio'

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  vi.useRealTimers()
  setAudioContextFactory()
})

describe('playCue', () => {
  it('knows every cue', () => {
    expect([...ASMR_CUES].sort()).toEqual([
      'chime',
      'mist',
      'pour_water',
      'prune',
      'repot',
      'scatter',
    ])
  })
  it.each(ASMR_CUES)(
    '%s creates and starts an oscillator, then disconnects when it ends',
    (cue) => {
      const { ctx, oscs, gains } = createFakeAudio()
      playCue(ctx, cue)
      expect(oscs).toHaveLength(1)
      expect(oscs[0].started && oscs[0].stopped).toBe(true)
      oscs[0].onended?.()
      expect(oscs[0].disconnected && gains[0].disconnected).toBe(true)
    },
  )
})

describe('startAmbient', () => {
  it.each(['stream', 'rain', 'forest', 'night'] as SoundPresetId[])(
    '%s schedules grains',
    (preset) => {
      const { ctx, oscs } = createFakeAudio()
      const h = startAmbient(ctx, preset)
      expect(oscs).toHaveLength(0)
      vi.advanceTimersByTime(AMBIENT_INTERVAL_MS * 3)
      expect(oscs).toHaveLength(3)
      expect(oscs.every((o) => o.started)).toBe(true)
      h.stop()
    },
  )
  it('stop() clears every timer and disconnects live nodes', () => {
    const { ctx, oscs, gains } = createFakeAudio()
    const h = startAmbient(ctx, 'stream')
    vi.advanceTimersByTime(AMBIENT_INTERVAL_MS * 2)
    h.stop()
    expect(vi.getTimerCount()).toBe(0)
    expect(oscs.every((o) => o.disconnected) && gains.every((g) => g.disconnected)).toBe(true)
    vi.advanceTimersByTime(AMBIENT_INTERVAL_MS * 5)
    expect(oscs).toHaveLength(2)
  })
})

describe('ensureAudioContext', () => {
  it('is a lazy singleton that resumes when suspended and on visibilitychange', () => {
    const { ctx } = createFakeAudio()
    const factory = vi.fn(() => ctx)
    setAudioContextFactory(factory)
    expect(factory).not.toHaveBeenCalled()
    expect(ensureAudioContext()).toBe(ctx)
    expect(ensureAudioContext()).toBe(ctx)
    expect(factory).toHaveBeenCalledTimes(1)
    const before = ctx.resumed
    document.dispatchEvent(new Event('visibilitychange'))
    expect(ctx.resumed).toBeGreaterThan(before)
  })
})
