import { afterEach, describe, expect, it, vi } from 'vitest'
import { exportSnapshotPng, snapshotFilename } from '@/lib/snapshot'

describe('exportSnapshotPng', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('encodes the canvas once and downloads it under the given filename', async () => {
    const blob = new Blob(['x'], { type: 'image/png' })
    const toBlob = vi.fn((cb: BlobCallback, type?: string) => {
      expect(type).toBe('image/png')
      cb(blob)
    })
    const canvas = { toBlob } as unknown as HTMLCanvasElement
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:fake'),
      revokeObjectURL: vi.fn(),
    })
    let downloaded = ''
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloaded = this.download
    })

    await expect(exportSnapshotPng(canvas, 'a.png')).resolves.toBe(true)
    expect(toBlob).toHaveBeenCalledTimes(1)
    expect(click).toHaveBeenCalledTimes(1)
    expect(downloaded).toBe('a.png')
  })

  it('resolves false without downloading when encoding fails', async () => {
    const canvas = { toBlob: (cb: BlobCallback) => cb(null) } as unknown as HTMLCanvasElement
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    await expect(exportSnapshotPng(canvas, 'a.png')).resolves.toBe(false)
    expect(click).not.toHaveBeenCalled()
  })

  it('names files like the prototype', () => {
    expect(snapshotFilename(3.9)).toBe('botanica-living-biosphere-day-3.png')
  })
})
