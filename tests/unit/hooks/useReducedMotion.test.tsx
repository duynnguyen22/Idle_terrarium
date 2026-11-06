import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { createDefaultState, partialize, useStudioStore } from '@/store/useStudioStore'

describe('useReducedMotion', () => {
  beforeEach(() => useStudioStore.setState(createDefaultState()))

  it('mirrors the media query into the store and follows changes', () => {
    let listener: () => void = () => {}
    const mql = {
      matches: true,
      addEventListener: (_: string, l: () => void) => (listener = l),
      removeEventListener: () => {},
    }
    window.matchMedia = (() => mql) as unknown as typeof window.matchMedia
    renderHook(() => useReducedMotion())
    expect(useStudioStore.getState().reducedMotion).toBe(true)
    mql.matches = false
    act(() => listener())
    expect(useStudioStore.getState().reducedMotion).toBe(false)
  })

  it('is not persisted', () => {
    expect('reducedMotion' in partialize(useStudioStore.getState())).toBe(false)
  })
})
