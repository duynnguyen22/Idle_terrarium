import { act, renderHook } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AUTH_SESSION_KEY, AUTH_USERS_KEY } from '@/auth'
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
  useStudioStore.setState(createDefaultState())
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
