import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { appStore } from '@/store/appStore'
import {
  createDefaultState,
  partialize,
  patchStudioAtom,
  reducedMotionAtom,
  studioStateAtom,
} from '@/store/studio'

describe('useReducedMotion', () => {
  beforeEach(() => appStore.set(patchStudioAtom, createDefaultState()))
  afterEach(() => vi.unstubAllGlobals())

  it('mirrors the media query into the store and follows changes', () => {
    let listener: () => void = () => {}
    const mql = {
      matches: true,
      addEventListener: (_: string, l: () => void) => (listener = l),
      removeEventListener: () => {},
    }
    vi.stubGlobal('matchMedia', () => mql)
    renderHook(() => useReducedMotion())
    expect(appStore.get(reducedMotionAtom)).toBe(true)
    mql.matches = false
    act(() => listener())
    expect(appStore.get(reducedMotionAtom)).toBe(false)
  })

  it('is not persisted', () => {
    expect('reducedMotion' in partialize(appStore.get(studioStateAtom))).toBe(false)
  })
})
