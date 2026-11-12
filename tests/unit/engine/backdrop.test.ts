import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BACKDROPS } from '@/data/backdrops'
import type { BackdropId } from '@/data/types'
import { drawMiniatureBackdrop, paintBackdrop, resetBackdropCache } from '@/engine/render/backdrop'
import { computeVesselRect, renderFrame } from '@/engine/render/renderFrame'
import { createWorld } from '@/engine/world'
import { getCustomBackdrop, loadCustomBackdrop } from '@/lib/backdropPhoto'
import { createDefaultState, type StudioState } from '@/store/studio'
import { makeRecordingContext, makeTraceContext } from '../helpers/recordingContext'

const PAINTED: BackdropId[] = ['karst', 'terraces', 'pines', 'alpine', 'falls', 'mesa']
const R = computeVesselRect(800, 600)

function stateWith(patch: Partial<StudioState>): StudioState {
  return { ...createDefaultState(), ...patch }
}

/** Offscreen canvases get a recording context; returns the getContext spy. */
function stubOffscreenContext() {
  return vi
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockImplementation(() => makeRecordingContext().ctx as never)
}

beforeEach(() => resetBackdropCache())
afterEach(() => vi.restoreAllMocks())

describe('BACKDROPS', () => {
  it('lists the eight backdrops in prototype order', () => {
    expect(BACKDROPS.map((b) => b.id)).toEqual([
      'none',
      'karst',
      'terraces',
      'pines',
      'alpine',
      'falls',
      'mesa',
      'custom',
    ])
    expect(BACKDROPS.find((b) => b.id === 'karst')?.name).toBe('Ha Long karst')
  })
})

describe('paintBackdrop', () => {
  it('paintBackdrop is deterministic per id', () => {
    const traces = PAINTED.map((id) => {
      const a = makeTraceContext()
      const b = makeTraceContext()
      paintBackdrop(a.ctx, id, 300, 200)
      paintBackdrop(b.ctx, id, 300, 200)
      expect(a.trace.length).toBeGreaterThan(20)
      expect(a.trace).toEqual(b.trace)
      return a.trace.join('\n')
    })
    // Every scene is distinct
    expect(new Set(traces).size).toBe(PAINTED.length)
  })

  it('balances save and restore and starts from a cleared canvas', () => {
    for (const id of PAINTED) {
      const { ctx, trace } = makeTraceContext()
      paintBackdrop(ctx, id, 144, 96)
      expect(trace[0]).toBe('save([])')
      expect(trace[1]).toBe('clearRect([0,0,144,96])')
      expect(trace[trace.length - 1]).toBe('restore([])')
    }
  })

  it('custom crops a loaded photo to the canvas aspect, or fills a placeholder without one', () => {
    const img = { complete: true, width: 400, height: 100, src: 'data:x' } as HTMLImageElement
    const withPhoto = makeTraceContext()
    paintBackdrop(withPhoto.ctx, 'custom', 300, 200, img)
    // Wider photo: full height, centred 150px-wide slice
    expect(withPhoto.trace).toContain(
      'drawImage([{"complete":true,"width":400,"height":100,"src":"data:x"},125,0,150,100,0,0,300,200])',
    )
    const without = makeTraceContext()
    paintBackdrop(without.ctx, 'custom', 300, 200, null)
    expect(without.trace).toContain('fillStyle=#e4e8e0')
    expect(without.trace.some((t) => t.startsWith('drawImage'))).toBe(false)
  })
})

describe('drawMiniatureBackdrop', () => {
  it('drawMiniatureBackdrop does nothing for none, and for custom without a photo', () => {
    for (const backdrop of ['none', 'custom'] as const) {
      const { ctx, calls } = makeRecordingContext()
      drawMiniatureBackdrop(ctx, stateWith({ backdrop }), R, null)
      expect(calls.filter((c) => c === 'drawImage')).toHaveLength(0)
      expect(calls).toHaveLength(0)
    }
  })

  it('haze 35 at day paints rgba(236, 241, 236, 0.210) over the backdrop; at night rgba(15, 23, 42, 0.193)', () => {
    stubOffscreenContext()
    const day: unknown[] = []
    const dayCtx = makeRecordingContext(day)
    drawMiniatureBackdrop(
      dayCtx.ctx,
      stateWith({ backdrop: 'karst', backdropHaze: 35, lighting: 'sunlight' }),
      R,
      null,
    )
    expect(dayCtx.calls.filter((c) => c === 'drawImage')).toHaveLength(1)
    expect(day).toEqual(['rgba(236, 241, 236, 0.210)'])

    const night: unknown[] = []
    const nightCtx = makeRecordingContext(night)
    drawMiniatureBackdrop(
      nightCtx.ctx,
      stateWith({ backdrop: 'karst', backdropHaze: 35, lighting: 'night' }),
      R,
      null,
    )
    expect(night).toEqual(['rgba(15, 23, 42, 0.193)', 'rgba(8, 14, 34, 0.62)'])
  })

  it('tints twilight and dawn, and skips the haze wash at 0', () => {
    stubOffscreenContext()
    const twilight: unknown[] = []
    drawMiniatureBackdrop(
      makeRecordingContext(twilight).ctx,
      stateWith({ backdrop: 'pines', backdropHaze: 0, lighting: 'twilight' }),
      R,
      null,
    )
    expect(twilight).toEqual(['rgba(96, 44, 70, 0.30)'])
    const dawn: unknown[] = []
    drawMiniatureBackdrop(
      makeRecordingContext(dawn).ctx,
      stateWith({ backdrop: 'pines', backdropHaze: 80, lighting: 'dawn' }),
      R,
      null,
    )
    expect(dawn).toEqual(['rgba(236, 241, 236, 0.480)', 'rgba(255, 196, 150, 0.14)'])
  })

  it('paints the scene once and reuses it until the backdrop or size changes', () => {
    const spy = stubOffscreenContext()
    const state = stateWith({ backdrop: 'mesa' })
    drawMiniatureBackdrop(makeRecordingContext().ctx, state, R, null)
    drawMiniatureBackdrop(makeRecordingContext().ctx, state, R, null)
    expect(spy).toHaveBeenCalledTimes(1)
    drawMiniatureBackdrop(makeRecordingContext().ctx, stateWith({ backdrop: 'falls' }), R, null)
    expect(spy).toHaveBeenCalledTimes(2)
    drawMiniatureBackdrop(
      makeRecordingContext().ctx,
      stateWith({ backdrop: 'falls' }),
      computeVesselRect(1000, 700),
      null,
    )
    expect(spy).toHaveBeenCalledTimes(3)
  })

  it('repaints when the photo is replaced by one with an equal-length data URL', async () => {
    /** jsdom never decodes images: this one "loads" on the next tick. */
    class FakeImage {
      width = 300
      height = 200
      complete = false
      onload: (() => void) | null = null
      private source = ''
      get src() {
        return this.source
      }
      set src(v: string) {
        this.source = v
        setTimeout(() => {
          this.complete = true
          this.onload?.()
        }, 0)
      }
    }
    vi.stubGlobal('Image', FakeImage)
    const drawn: unknown[] = []
    const offscreen = makeRecordingContext().ctx
    Object.assign(offscreen, { drawImage: (img: unknown) => drawn.push(img) })
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(offscreen as never)
    const state = stateWith({ backdrop: 'custom' })
    try {
      localStorage.setItem('botanica_backdrop_photo_v1', 'data:image/jpeg;base64,AAAA')
      const first = await loadCustomBackdrop()
      drawMiniatureBackdrop(makeRecordingContext().ctx, state, R, getCustomBackdrop())
      localStorage.setItem('botanica_backdrop_photo_v1', 'data:image/jpeg;base64,BBBB')
      const second = await loadCustomBackdrop()
      expect(second?.src.length).toBe(first?.src.length)
      drawMiniatureBackdrop(makeRecordingContext().ctx, state, R, getCustomBackdrop())
      expect(drawn).toEqual([first, second])
    } finally {
      localStorage.clear()
      vi.unstubAllGlobals()
    }
  })

  it('draws nothing when the offscreen canvas has no 2D context', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    const { ctx, calls } = makeRecordingContext()
    expect(() =>
      drawMiniatureBackdrop(ctx, stateWith({ backdrop: 'karst' }), R, null),
    ).not.toThrow()
    expect(calls).toHaveLength(0)
  })
})

describe('renderFrame', () => {
  it('still paints the lamp cone inside the glass with no backdrop', () => {
    const { ctx, calls } = makeRecordingContext()
    const state = stateWith({ backdrop: 'none', hasGrowLamp: true, lighting: 'sunlight' })
    renderFrame(ctx, createWorld(), state, R, 0, { w: 800, h: 600 })
    const clip = calls.indexOf('clip')
    expect(clip).toBeGreaterThan(-1)
    expect(calls.indexOf('createRadialGradient', clip)).toBeGreaterThan(clip)
    expect(calls).not.toContain('drawImage')
  })

  it('paints the backdrop inside the vessel clip, under the lamp cone', () => {
    stubOffscreenContext()
    const { ctx, calls } = makeRecordingContext()
    const state = stateWith({ backdrop: 'alpine', hasGrowLamp: true, lighting: 'sunlight' })
    renderFrame(ctx, createWorld(), state, R, 0, { w: 800, h: 600 })
    const clip = calls.indexOf('clip')
    const draw = calls.indexOf('drawImage')
    expect(calls.filter((c) => c === 'drawImage')).toHaveLength(1)
    expect(clip).toBeGreaterThan(-1)
    expect(draw).toBeGreaterThan(clip)
    // The first radial gradient inside the glass is the lamp cone, painted over the scene
    expect(calls.indexOf('createRadialGradient', clip)).toBeGreaterThan(draw)
  })
})
