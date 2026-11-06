import { render } from '@testing-library/react'
import { useRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mutateWorld, getWorld, unregisterWorld } from '@/engine/engineBridge'
import { configureSpriteCache } from '@/engine/sprites/spriteCache'
import { useTerrariumEngine } from '@/hooks/useTerrariumEngine'
import { useStudioStore } from '@/store/useStudioStore'
import { makeRecordingContext } from '../helpers/recordingContext'

function Harness() {
  const ref = useRef<HTMLCanvasElement>(null)
  useTerrariumEngine(ref)
  return <canvas ref={ref} width={800} height={600} />
}

describe('useTerrariumEngine', () => {
  let callbacks: Map<number, FrameRequestCallback>
  let nextId: number
  let ctxCalls: string[]
  const cancel = vi.fn()

  const runFrame = (t: number) => {
    const pending = [...callbacks.entries()]
    callbacks.clear()
    pending.forEach(([, cb]) => cb(t))
  }

  beforeEach(() => {
    callbacks = new Map()
    nextId = 1
    cancel.mockClear()
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      callbacks.set(nextId, cb)
      return nextId++
    })
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      cancel(id)
      callbacks.delete(id)
    })
    const rec = makeRecordingContext()
    ctxCalls = rec.calls
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      rec.ctx as unknown as ReturnType<HTMLCanvasElement['getContext']>,
    )
    configureSpriteCache(
      () => ({ width: 0, height: 0, getContext: () => null }) as unknown as HTMLCanvasElement,
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    configureSpriteCache()
  })

  it('starts exactly one loop, keeps it single across frames, and stops on unmount', () => {
    const { unmount } = render(<Harness />)
    expect(callbacks.size).toBe(1)
    runFrame(16)
    runFrame(32)
    expect(callbacks.size).toBe(1)
    expect(ctxCalls.filter((c) => c === 'clip').length).toBe(2)
    unmount()
    expect(callbacks.size).toBe(0)
    expect(cancel).toHaveBeenCalled()
  })

  it('never writes to the store during a frame', () => {
    const setState = vi.spyOn(useStudioStore, 'setState')
    render(<Harness />)
    runFrame(16)
    runFrame(500)
    expect(setState).not.toHaveBeenCalled()
  })

  it('pauses while the document is hidden and resumes when visible', () => {
    render(<Harness />)
    const hidden = vi.spyOn(document, 'hidden', 'get')
    hidden.mockReturnValue(true)
    document.dispatchEvent(new Event('visibilitychange'))
    expect(callbacks.size).toBe(0)
    hidden.mockReturnValue(false)
    document.dispatchEvent(new Event('visibilitychange'))
    expect(callbacks.size).toBe(1)
  })

  it('registers its world, skips its own snapshots, applies external ones, and unregisters', () => {
    const { unmount } = render(<Harness />)
    const world = getWorld()
    const contourBefore = world.terrainContour
    const itemsBefore = world.items
    mutateWorld((w) => {
      w.terrainContour[0] = 7
    })
    expect(useStudioStore.getState().worldSnapshot?.terrainContour[0]).toBe(7)
    // Own write: restoreWorld skipped, so the world's arrays are not replaced.
    expect(world.terrainContour).toBe(contourBefore)
    expect(world.items).toBe(itemsBefore)

    const external = { items: [], terrainContour: new Array<number>(21).fill(1) }
    useStudioStore.getState().setWorldSnapshot(external)
    expect(world.terrainContour[0]).toBe(1)
    expect(world.terrainContour).not.toBe(contourBefore)

    unmount()
    expect(() => getWorld()).toThrow(/no world registered/)
    unregisterWorld()
  })
})
