import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { showToast, useToastStore } from '@/store/toastStore'

beforeEach(() => {
  vi.useFakeTimers()
  useToastStore.setState({ message: '', visible: false })
})
afterEach(() => vi.useRealTimers())

describe('toastStore', () => {
  it('re-triggering before the timeout resets the timer', () => {
    showToast('one')
    vi.advanceTimersByTime(2000)
    showToast('two')
    vi.advanceTimersByTime(2000)
    expect(useToastStore.getState()).toMatchObject({ message: 'two', visible: true })
    vi.advanceTimersByTime(201)
    expect(useToastStore.getState().visible).toBe(false)
  })
})
