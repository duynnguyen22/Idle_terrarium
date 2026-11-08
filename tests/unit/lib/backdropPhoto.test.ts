import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeRecordingContext } from '../helpers/recordingContext'

type PhotoModule = typeof import('@/lib/backdropPhoto')
let photo: PhotoModule

const KEY = 'botanica_backdrop_photo_v1'
const JPEG = 'data:image/jpeg;base64,AAAA'

/** jsdom never decodes images: this one "loads" on the next tick with a fixed size. */
class FakeImage {
  static size = { width: 3200, height: 1600 }
  width = 0
  height = 0
  complete = false
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  private source = ''
  get src() {
    return this.source
  }
  set src(v: string) {
    this.source = v
    setTimeout(() => {
      this.width = FakeImage.size.width
      this.height = FakeImage.size.height
      this.complete = true
      this.onload?.()
    }, 0)
  }
}

const pngFile = () => new File(['png-bytes'], 'tank.png', { type: 'image/png' })

beforeEach(async () => {
  vi.resetModules()
  localStorage.clear()
  photo = await import('@/lib/backdropPhoto')
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('backdropPhoto', () => {
  it('rejects a non-image file with the toast text', async () => {
    await expect(
      photo.setCustomBackdropFromFile(new File(['x'], 'a.txt', { type: 'text/plain' })),
    ).rejects.toMatchObject({ message: 'Choose an image file (JPG, PNG or WebP)' })
    expect(photo.getCustomBackdrop()).toBeNull()
  })

  it('has no custom backdrop until one is loaded, and loads nothing from empty storage', async () => {
    expect(photo.getCustomBackdrop()).toBeNull()
    await expect(photo.loadCustomBackdrop()).resolves.toBeNull()
    expect(photo.getCustomBackdrop()).toBeNull()
  })

  describe('with image decoding stubbed', () => {
    let sizes: { width: number; height: number }[]
    beforeEach(() => {
      vi.stubGlobal('Image', FakeImage)
      sizes = []
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
        () => makeRecordingContext().ctx as never,
      )
      vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(function (
        this: HTMLCanvasElement,
        type?: string,
        quality?: unknown,
      ) {
        sizes.push({ width: this.width, height: this.height })
        expect(type).toBe('image/jpeg')
        expect(quality).toBe(0.86)
        return JPEG
      })
    })

    it('downsizes to 1600 px, stores the JPEG, publishes it and notifies subscribers', async () => {
      const cb = vi.fn()
      const unsubscribe = photo.subscribeCustomBackdrop(cb)
      const { img, toast } = await photo.setCustomBackdropFromFile(pngFile())
      expect(toast).toBe('Your photo is now the backdrop')
      expect(sizes).toEqual([{ width: 1600, height: 800 }])
      expect(localStorage.getItem(KEY)).toBe(JPEG)
      expect(img.src).toBe(JPEG)
      expect(photo.getCustomBackdrop()).toBe(img)
      expect(cb).toHaveBeenCalledTimes(1)
      unsubscribe()
    })

    it('keeps a small photo at its own size', async () => {
      FakeImage.size = { width: 800, height: 600 }
      try {
        await photo.setCustomBackdropFromFile(pngFile())
        expect(sizes).toEqual([{ width: 800, height: 600 }])
      } finally {
        FakeImage.size = { width: 3200, height: 1600 }
      }
    })

    it('still sets the backdrop when storage is full, with the too-large toast', async () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('full', 'QuotaExceededError')
      })
      const { img, toast } = await photo.setCustomBackdropFromFile(pngFile())
      expect(toast).toBe('Backdrop set; it is too large to remember after reload')
      expect(photo.getCustomBackdrop()).toBe(img)
    })

    it('restores the stored photo on load', async () => {
      localStorage.setItem(KEY, JPEG)
      const cb = vi.fn()
      photo.subscribeCustomBackdrop(cb)
      const img = await photo.loadCustomBackdrop()
      expect(img?.src).toBe(JPEG)
      expect(photo.getCustomBackdrop()).toBe(img)
      expect(cb).toHaveBeenCalledTimes(1)
    })

    it('bumps the revision on every published photo', async () => {
      expect(photo.getCustomBackdropRevision()).toBe(0)
      await photo.setCustomBackdropFromFile(pngFile())
      expect(photo.getCustomBackdropRevision()).toBe(1)
      localStorage.setItem(KEY, JPEG)
      await photo.loadCustomBackdrop()
      expect(photo.getCustomBackdropRevision()).toBe(2)
    })
  })
})
