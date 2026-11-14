import { afterEach, describe, expect, it, vi } from 'vitest'
import { gpuImage } from '@/engine/sprites/gpuImage'

const canvas = (w = 4) => ({ width: w, height: w }) as unknown as HTMLCanvasElement

afterEach(() => vi.unstubAllGlobals())

describe('gpuImage', () => {
  it('returns the canvas itself when disabled or when createImageBitmap is missing', () => {
    const c = canvas()
    const spy = vi.fn(() => Promise.resolve({} as ImageBitmap))
    vi.stubGlobal('createImageBitmap', spy)
    expect(gpuImage(c, false)).toBe(c)
    expect(spy).not.toHaveBeenCalled()
    vi.stubGlobal('createImageBitmap', undefined)
    const d = canvas()
    expect(gpuImage(d, true)).toBe(d)
  })

  it('returns the canvas first, then the bitmap once the promise resolves', async () => {
    const bmp = { close() {} } as unknown as ImageBitmap
    vi.stubGlobal('createImageBitmap', () => Promise.resolve(bmp))
    const c = canvas()
    expect(gpuImage(c, true)).toBe(c)
    await Promise.resolve()
    await Promise.resolve()
    expect(gpuImage(c, true)).toBe(bmp)
  })

  it('returns the same bitmap for the same canvas and asks only once', async () => {
    const bmp = {} as ImageBitmap
    const spy = vi.fn(() => Promise.resolve(bmp))
    vi.stubGlobal('createImageBitmap', spy)
    const c = canvas()
    gpuImage(c, true)
    gpuImage(c, true)
    await Promise.resolve()
    await Promise.resolve()
    expect(gpuImage(c, true)).toBe(bmp)
    expect(gpuImage(c, true)).toBe(bmp)
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('keeps drawing the canvas when createImageBitmap rejects, and skips empty canvases', async () => {
    const spy = vi.fn(() => Promise.reject(new Error('no')))
    vi.stubGlobal('createImageBitmap', spy)
    const c = canvas()
    gpuImage(c, true)
    await Promise.resolve()
    await Promise.resolve()
    expect(gpuImage(c, true)).toBe(c)
    const empty = canvas(0)
    expect(gpuImage(empty, true)).toBe(empty)
    expect(spy).toHaveBeenCalledTimes(1)
  })
})
