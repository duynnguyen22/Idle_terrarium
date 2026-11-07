import { afterEach, describe, expect, it } from 'vitest'
import { ALL_CATALOG_DEFS, FAUNA, type CatalogId } from '@/data/catalog'
import { FAUNA_SPRITES } from '@/engine/sprites/fauna'
import { record } from '../helpers/recordingContext'
import { drawSprite } from '@/engine/sprites/drawSprite'
import {
  configureSpriteCache,
  getSprite,
  getSpriteDataUrl,
  THUMB_SIZE,
  thumbnailFrame,
  warmSpriteCache,
} from '@/engine/sprites/spriteCache'

const PAINT_CALLS = new Set(['fill', 'stroke', 'fillRect'])

function makeStubContext() {
  const calls: string[] = []
  const state: Record<string, unknown> = {}
  const gradient = { addColorStop: () => undefined }
  const ctx = new Proxy(state, {
    get(target, prop: string) {
      if (prop in target) return target[prop]
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
        return () => {
          calls.push(prop)
          return gradient
        }
      }
      return (...args: unknown[]) => {
        void args
        calls.push(prop)
      }
    },
    set(target, prop: string, value) {
      target[prop] = value
      return true
    },
  }) as unknown as CanvasRenderingContext2D
  return { ctx, calls }
}

function makeStubCanvas() {
  const { ctx, calls } = makeStubContext()
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ctx,
    toDataURL: () => 'data:image/png;base64,STUB',
  } as unknown as HTMLCanvasElement
  return { canvas, calls }
}

afterEach(() => configureSpriteCache())

describe('drawSprite', () => {
  it.each(ALL_CATALOG_DEFS.map((d) => d.id))('%s draws without throwing and paints', (id) => {
    const { ctx, calls } = makeStubContext()
    expect(() => drawSprite(ctx, id)).not.toThrow()
    expect(calls.some((c) => PAINT_CALLS.has(c))).toBe(true)
    expect(calls.filter((c) => c === 'save')).toHaveLength(
      calls.filter((c) => c === 'restore').length,
    )
  })

  it('scales the 128-unit design grid to the requested size', () => {
    const { ctx, calls } = makeStubContext()
    drawSprite(ctx, 'quartz', 128)
    expect(calls.slice(0, 3)).toEqual(['save', 'scale', 'translate'])
  })

  it('falls back to a blob for an unknown id', () => {
    const { ctx, calls } = makeStubContext()
    drawSprite(ctx, 'nope' as CatalogId)
    expect(calls).toContain('arc')
    expect(calls).toContain('fill')
  })
})

describe('spriteCache', () => {
  it('returns the same 256x256 canvas on repeat calls and draws once', () => {
    let made = 0
    const stubs: ReturnType<typeof makeStubCanvas>[] = []
    configureSpriteCache(() => {
      made++
      const s = makeStubCanvas()
      stubs.push(s)
      return s.canvas
    })
    const a = getSprite('quartz')
    const b = getSprite('quartz')
    expect(a).toBe(b)
    expect(made).toBe(1)
    expect(a.width).toBe(256)
    expect(a.height).toBe(256)
    expect(stubs[0].calls.length).toBeGreaterThan(0)
  })

  it('warmSpriteCache creates exactly N canvases for N ids', () => {
    let made = 0
    configureSpriteCache(() => {
      made++
      return makeStubCanvas().canvas
    })
    const ids = ALL_CATALOG_DEFS.slice(0, 5).map((d) => d.id)
    warmSpriteCache(ids)
    warmSpriteCache(ids)
    expect(made).toBe(5)
  })

  it('memoizes data URLs', () => {
    let urls = 0
    configureSpriteCache(() => {
      const { canvas } = makeStubCanvas()
      canvas.toDataURL = () => `data:${urls++}`
      return canvas
    })
    expect(getSpriteDataUrl('quartz')).toBe(getSpriteDataUrl('quartz'))
    expect(urls).toBe(1)
  })
})

describe('catalog thumbnails', () => {
  function rgbaWithBox(w: number, h: number, x0: number, y0: number, x1: number, y1: number) {
    const data = new Uint8ClampedArray(w * h * 4)
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) data[(y * w + x) * 4 + 3] = 255
    return data
  }

  it('frames the drawn pixels so a small creature fills the thumbnail with a 12% margin', () => {
    // a 20x10 creature in a 256 sprite: side 20, pad 2, so 192 / 24 = 8x
    const frame = thumbnailFrame(rgbaWithBox(256, 256, 100, 120, 119, 129), 256, 256)
    expect(frame).toEqual({ scale: 8, cx: 110, cy: 125 })
  })

  it('ignores near-transparent pixels and returns null for an empty sprite', () => {
    const faint = new Uint8ClampedArray(16 * 16 * 4).fill(8)
    expect(thumbnailFrame(faint, 16, 16)).toBeNull()
  })

  it('redraws the sprite onto a 192px canvas centred on the drawn pixels', () => {
    const made: ReturnType<typeof makeStubCanvas>[] = []
    configureSpriteCache(() => {
      const stub = makeStubCanvas()
      made.push(stub)
      const ctx = stub.canvas.getContext('2d') as unknown as Record<string, unknown>
      ctx.getImageData = (_x: number, _y: number, w: number, h: number) => ({
        data: rgbaWithBox(w, h, 100, 120, 119, 129),
      })
      return stub.canvas
    })
    getSpriteDataUrl('springtails')
    expect(made).toHaveLength(2)
    const thumb = made[1]!
    expect([thumb.canvas.width, thumb.canvas.height]).toEqual([THUMB_SIZE, THUMB_SIZE])
    expect(thumb.calls.some((c) => c === 'fill')).toBe(true)
  })
})

describe('fauna sprites', () => {
  it('isopod variants draw different paths and every fauna sprite paints', () => {
    const a = record((ctx) => FAUNA_SPRITES.isopod?.(ctx))
    const b = record((ctx) => FAUNA_SPRITES.ducky_isopod?.(ctx))
    expect(a.fillStyles).not.toEqual(b.fillStyles)
    for (const id of FAUNA.map((f) => f.id)) {
      const fills = record((ctx) => FAUNA_SPRITES[id]?.(ctx)).calls.filter((c) => c.name === 'fill')
      expect(fills.length).toBeGreaterThan(3)
    }
  })
})
