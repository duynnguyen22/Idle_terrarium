import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useLayoutMode } from '@/hooks/useLayoutMode'
import { appStore } from '@/store/appStore'
import { layoutModeAtom, viewportHeightAtom } from '@/store/layout'

const PHONE = '(max-width: 640px)'

describe('useLayoutMode', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('sets phone, then land after a rotate', () => {
    const state = { phone: true, land: false }
    const listeners: Array<() => void> = []
    vi.stubGlobal('matchMedia', (query: string) => ({
      get matches() {
        return query === PHONE ? state.phone : state.land
      },
      addEventListener: (_: string, l: () => void) => listeners.push(l),
      removeEventListener: () => {},
    }))
    renderHook(() => useLayoutMode())
    expect(appStore.get(layoutModeAtom)).toBe('phone')
    state.land = true
    act(() => listeners.forEach((l) => l()))
    expect(appStore.get(layoutModeAtom)).toBe('land')
  })

  it('tracks the viewport height on resize', () => {
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
    renderHook(() => useLayoutMode())
    vi.stubGlobal('innerHeight', 600)
    act(() => {
      window.dispatchEvent(new Event('resize'))
    })
    expect(appStore.get(viewportHeightAtom)).toBe(600)
  })
})
