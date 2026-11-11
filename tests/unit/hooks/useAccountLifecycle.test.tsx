import { act, renderHook } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AUTH_SESSION_KEY, AUTH_USERS_KEY } from '@/auth'
import { snapshotWorld } from '@/engine/persistence'
import { createWorld } from '@/engine/world'
import { useAccountLifecycle } from '@/hooks/useAccountLifecycle'
import { useAccountStore } from '@/store/useAccountStore'
import { createDefaultState, useStudioStore } from '@/store/useStudioStore'

const initAccount = vi.fn(() => Promise.resolve())
const watchSession = vi.fn()
const scheduleCloudSave = vi.fn()

beforeEach(() => {
  vi.useFakeTimers()
  initAccount.mockClear()
  watchSession.mockClear()
  scheduleCloudSave.mockClear()
  // createDefaultState draws a fresh worldSeed; keep the live one so the reset is not a persisted change.
  useStudioStore.setState({
    ...createDefaultState(),
    worldSeed: useStudioStore.getState().worldSeed,
  })
  useAccountStore.setState({
    ...useAccountStore.getInitialState(),
    initAccount,
    watchSession,
    scheduleCloudSave,
  })
})
afterEach(() => {
  vi.useRealTimers()
  useAccountStore.setState(useAccountStore.getInitialState(), true)
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
    act(() => useStudioStore.setState({ selectedId: 'x' }))
    expect(scheduleCloudSave).not.toHaveBeenCalled()
    act(() => useStudioStore.setState({ dayCount: useStudioStore.getState().dayCount + 1 }))
    expect(scheduleCloudSave).toHaveBeenCalledTimes(1)
  })

  it('simulation writes (env seed, cycle progress, glass residue) do not schedule a save; an item edit does', () => {
    renderHook(() => useAccountLifecycle())
    act(() => {
      const s = useStudioStore.getState()
      s.setEnvSeed({ humidity: 61.3, temperature: 23.4, soilMoisture: 47.2, nutrients: 66.1 })
      s.setCycleProgress(0.42)
      s.setMineralSpots(0.25)
    })
    expect(useStudioStore.getState()).toMatchObject({
      envSeed: { humidity: 61.3 },
      cycleProgress: 0.42,
      mineralSpots: 0.25,
    })
    expect(scheduleCloudSave).not.toHaveBeenCalled()
    // The engine commits a world snapshot after an item is placed, moved or removed.
    act(() => useStudioStore.getState().setWorldSnapshot(snapshotWorld(createWorld())))
    expect(scheduleCloudSave).toHaveBeenCalledTimes(1)
  })

  it('the 120 s tick saves only when visible and signed in to the cloud', () => {
    renderHook(() => useAccountLifecycle())
    act(() => {
      vi.advanceTimersByTime(120_000)
    })
    expect(scheduleCloudSave).not.toHaveBeenCalled()

    useAccountStore.setState({ phase: 'cloud' })
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
      useStudioStore.setState({ dayCount: useStudioStore.getState().dayCount + 1 })
      vi.advanceTimersByTime(240_000)
    })
    expect(watchSession).not.toHaveBeenCalled()
    expect(scheduleCloudSave).not.toHaveBeenCalled()
  })
})
