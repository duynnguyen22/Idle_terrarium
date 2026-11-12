import { act, renderHook } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AUTH_SESSION_KEY, AUTH_USERS_KEY } from '@/auth'
import { snapshotWorld } from '@/engine/persistence'
import { createWorld } from '@/engine/world'
import { useAccountLifecycle } from '@/hooks/useAccountLifecycle'
import { account, patchAccountAtom, resetAccountAtom } from '@/store/account'
import { appStore } from '@/store/appStore'
import {
  createDefaultState,
  cycleProgressAtom,
  dayCountAtom,
  envSeedAtom,
  mineralSpotsAtom,
  patchStudioAtom,
  studioStateAtom,
  worldSeedAtom,
  worldSnapshotAtom,
} from '@/store/studio'

const initAccount = vi.fn(() => Promise.resolve())
const watchSession = vi.fn()
const scheduleCloudSave = vi.fn()

beforeEach(() => {
  vi.useFakeTimers()
  initAccount.mockClear()
  watchSession.mockClear()
  scheduleCloudSave.mockClear()
  // createDefaultState draws a fresh worldSeed; keep the live one so the reset is not a persisted change.
  appStore.set(patchStudioAtom, {
    ...createDefaultState(),
    worldSeed: appStore.get(worldSeedAtom),
  })
  appStore.set(resetAccountAtom)
  // The hook calls the account singleton's methods, so replace them on the object.
  vi.spyOn(account, 'initAccount').mockImplementation(initAccount)
  vi.spyOn(account, 'watchSession').mockImplementation(watchSession)
  vi.spyOn(account, 'scheduleCloudSave').mockImplementation(scheduleCloudSave)
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  appStore.set(resetAccountAtom)
})

const storageEvent = (key: string) => window.dispatchEvent(new StorageEvent('storage', { key }))

describe('useAccountLifecycle', () => {
  it('inits once on mount, then the 60 s tick calls watchSession', () => {
    renderHook(() => useAccountLifecycle())
    expect(initAccount).toHaveBeenCalledTimes(1)
    expect(watchSession).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(60_000)
    })
    expect(watchSession).toHaveBeenCalledTimes(1)
    act(() => {
      vi.advanceTimersByTime(120_000)
    })
    expect(watchSession).toHaveBeenCalledTimes(3)
  })

  it('reads the session once under a StrictMode double mount', () => {
    const { unmount } = renderHook(() => useAccountLifecycle(), { wrapper: StrictMode })
    expect(initAccount).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(2)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('watches the two auth storage keys and ignores others', () => {
    renderHook(() => useAccountLifecycle())
    act(() => {
      storageEvent(AUTH_USERS_KEY)
      storageEvent(AUTH_SESSION_KEY)
      storageEvent('something_else')
    })
    expect(watchSession).toHaveBeenCalledTimes(2)
  })

  it('a persisted studio change schedules a cloud save; a transient one does not', () => {
    renderHook(() => useAccountLifecycle())
    act(() => appStore.set(patchStudioAtom, { selectedId: 'x' }))
    expect(scheduleCloudSave).not.toHaveBeenCalled()
    act(() => appStore.set(dayCountAtom, appStore.get(dayCountAtom) + 1))
    expect(scheduleCloudSave).toHaveBeenCalledTimes(1)
  })

  it('simulation writes (env seed, cycle progress, glass residue) do not schedule a save; an item edit does', () => {
    renderHook(() => useAccountLifecycle())
    act(() => {
      appStore.set(envSeedAtom, {
        humidity: 61.3,
        temperature: 23.4,
        soilMoisture: 47.2,
        nutrients: 66.1,
      })
      appStore.set(cycleProgressAtom, 0.42)
      appStore.set(mineralSpotsAtom, 0.25)
    })
    expect(appStore.get(studioStateAtom)).toMatchObject({
      envSeed: { humidity: 61.3 },
      cycleProgress: 0.42,
      mineralSpots: 0.25,
    })
    expect(scheduleCloudSave).not.toHaveBeenCalled()
    // The engine commits a world snapshot after an item is placed, moved or removed.
    act(() => appStore.set(worldSnapshotAtom, snapshotWorld(createWorld())))
    expect(scheduleCloudSave).toHaveBeenCalledTimes(1)
  })

  it('the 120 s tick saves only when visible and signed in to the cloud', () => {
    renderHook(() => useAccountLifecycle())
    act(() => {
      vi.advanceTimersByTime(120_000)
    })
    expect(scheduleCloudSave).not.toHaveBeenCalled()

    appStore.set(patchAccountAtom, { phase: 'cloud' })
    act(() => {
      vi.advanceTimersByTime(120_000)
    })
    expect(scheduleCloudSave).toHaveBeenCalledTimes(1)

    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    act(() => {
      vi.advanceTimersByTime(120_000)
    })
    expect(scheduleCloudSave).toHaveBeenCalledTimes(1)
    visibility.mockRestore()
  })

  it('removes its intervals and listeners on unmount', () => {
    const { unmount } = renderHook(() => useAccountLifecycle())
    expect(vi.getTimerCount()).toBe(2)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
    act(() => {
      storageEvent(AUTH_SESSION_KEY)
      appStore.set(dayCountAtom, appStore.get(dayCountAtom) + 1)
      vi.advanceTimersByTime(240_000)
    })
    expect(watchSession).not.toHaveBeenCalled()
    expect(scheduleCloudSave).not.toHaveBeenCalled()
  })
})
