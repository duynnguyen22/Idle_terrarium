import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { appStore } from '@/store/appStore'
import { showToast, toastAtom } from '@/store/toast'

beforeEach(() => {
  vi.useFakeTimers()
  appStore.set(toastAtom, { message: '', visible: false })
})
afterEach(() => vi.useRealTimers())

describe('toast', () => {
  it('re-triggering before the timeout resets the timer', () => {
    showToast('one')
    vi.advanceTimersByTime(2000)
    showToast('two')
    vi.advanceTimersByTime(2000)
    expect(appStore.get(toastAtom)).toMatchObject({ message: 'two', visible: true })
    vi.advanceTimersByTime(201)
    expect(appStore.get(toastAtom).visible).toBe(false)
  })
})
