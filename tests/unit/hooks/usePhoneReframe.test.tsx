import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PlacedItem } from '@/data/types'
import { registerWorld, unregisterWorld } from '@/engine/engineBridge'
import { createWorld } from '@/engine/world'
import { camUntouched, usePhoneReframe } from '@/hooks/usePhoneReframe'
import { appStore } from '@/store/appStore'
import { layoutModeAtom, openSheetAtom, viewportHeightAtom } from '@/store/layout'
import { patchStudioAtom } from '@/store/studio'

const { framePlants } = vi.hoisted(() => ({ framePlants: vi.fn() }))
vi.mock('@/engine/view', async (importActual) => {
  const actual = await importActual<typeof import('@/engine/view')>()
  return {
    ...actual,
    framePlants: (...args: Parameters<typeof actual.framePlants>) => {
      framePlants(...args)
      actual.framePlants(...args)
    },
  }
})

const fern: PlacedItem = {
  uid: 'f1',
  id: 'peacock_fern',
  category: 'flora',
  x: 0.5,
  y: 0.6,
  scale: 1,
  rotation: 0,
  flipX: false,
  zIndex: 1,
  stage: 'lush',
}

function stubWorld() {
  const world = createWorld()
  world.items = [{ ...fern }]
  world.view.size = { w: 400, h: 700 }
  registerWorld(world)
  return world
}

/** Runs the two animation frames the hook waits for. */
const flush = () => act(() => void vi.advanceTimersByTime(100))

describe('camUntouched', () => {
  const t = { z: 1.5, u: 0.5, v: 0.5 }
  it('is true with no auto frame, or within tolerance', () => {
    expect(camUntouched(t, null)).toBe(true)
    expect(camUntouched(t, { ...t, z: 1.51 })).toBe(true)
  })
  it('is false once any axis moves 0.03', () => {
    expect(camUntouched(t, { ...t, z: 1.53 })).toBe(false)
    expect(camUntouched(t, { ...t, v: 0.47 })).toBe(false)
  })
})

describe('usePhoneReframe', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
      setTimeout(() => cb(0), 16),
    )
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id))
    framePlants.mockClear()
    appStore.set(patchStudioAtom, { relaxMode: false })
    appStore.set(openSheetAtom, null)
    appStore.set(viewportHeightAtom, 800)
    appStore.set(layoutModeAtom, 'phone')
  })
  afterEach(() => {
    unregisterWorld()
    appStore.set(layoutModeAtom, 'desktop')
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('reframes when a sheet opens, but not after the user zoomed', () => {
    const world = stubWorld()
    renderHook(() => usePhoneReframe())
    flush()
    framePlants.mockClear()
    act(() => appStore.set(openSheetAtom, 'build', 'peek'))
    flush()
    expect(framePlants).toHaveBeenCalledTimes(1)
    world.view.camT.z += 0.5
    act(() => appStore.set(openSheetAtom, 'build', 'half'))
    flush()
    expect(framePlants).toHaveBeenCalledTimes(1)
  })

  it('does nothing on desktop, in relax mode, or with nothing planted', () => {
    const world = stubWorld()
    renderHook(() => usePhoneReframe())
    flush()
    framePlants.mockClear()
    act(() => appStore.set(patchStudioAtom, { relaxMode: true }))
    act(() => appStore.set(openSheetAtom, 'build', 'peek'))
    flush()
    act(() => appStore.set(patchStudioAtom, { relaxMode: false }))
    world.items = []
    act(() => appStore.set(openSheetAtom, 'health', 'half'))
    flush()
    act(() => appStore.set(layoutModeAtom, 'desktop'))
    flush()
    expect(framePlants).not.toHaveBeenCalled()
  })

  it('treats the view as untouched again after leaving and re-entering handheld', () => {
    const world = stubWorld()
    renderHook(() => usePhoneReframe())
    flush()
    world.view.camT.z += 0.5
    act(() => appStore.set(layoutModeAtom, 'desktop'))
    flush()
    framePlants.mockClear()
    act(() => appStore.set(layoutModeAtom, 'phone'))
    flush()
    expect(framePlants).toHaveBeenCalledTimes(1)
  })
})
