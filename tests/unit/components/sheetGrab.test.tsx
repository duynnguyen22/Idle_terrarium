import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StudioLayout } from '@/components/layout/StudioLayout'
import { WELCOME_KEY } from '@/services/account'
import { appStore } from '@/store/appStore'
import { layoutModeAtom, openSheetAtom, sheetDragPxAtom, sheetLevelAtom } from '@/store/layout'
import { drawerAtom, resetOverlayAtom } from '@/store/overlay'
import { createDefaultState, patchStudioAtom, relaxModeAtom } from '@/store/studio'

vi.mock('@/services/audio', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/audio')>()),
  startAudioFromGesture: vi.fn(),
}))

const PHONE = '(max-width: 640px)'
const LABEL = 'Resize this panel. Tap to change its height, drag down to close'

const left = () => document.getElementById('left-sidebar') as HTMLElement
const grab = () => within(left()).getByRole('button', { name: LABEL })
const down = (y: number) =>
  act(() => void fireEvent.pointerDown(grab(), { clientY: y, pointerId: 1 }))
const move = (y: number) =>
  act(() => void fireEvent.pointerMove(grab(), { clientY: y, pointerId: 1 }))
const up = (y: number) => act(() => void fireEvent.pointerUp(grab(), { clientY: y, pointerId: 1 }))

beforeEach(() => {
  appStore.set(patchStudioAtom, createDefaultState())
  localStorage.setItem(WELCOME_KEY, '1')
  vi.stubGlobal('innerHeight', 800)
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query === PHONE,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
  render(<StudioLayout>{null}</StudioLayout>)
  act(() => appStore.set(openSheetAtom, 'build', 'half'))
})

afterEach(() => {
  appStore.set(resetOverlayAtom)
  appStore.set(relaxModeAtom, false)
  appStore.set(layoutModeAtom, 'desktop')
  appStore.set(sheetLevelAtom, 'half')
  appStore.set(sheetDragPxAtom, null)
  vi.unstubAllGlobals()
})

describe('sheet grab handle', () => {
  it('a tap steps half → full → half', () => {
    down(500)
    up(500)
    expect(appStore.get(sheetLevelAtom)).toBe('full')
    down(500)
    up(500)
    expect(appStore.get(sheetLevelAtom)).toBe('half')
    expect(appStore.get(drawerAtom)).toBe('left')
  })

  it('dragging up 200px from half snaps to full', () => {
    down(500)
    move(300)
    expect(appStore.get(sheetDragPxAtom)).toBe(632)
    expect(left()).toHaveAttribute('data-dragging')
    expect(left()).toHaveClass('transition-none')
    up(300)
    expect(appStore.get(sheetLevelAtom)).toBe('full')
    expect(appStore.get(sheetDragPxAtom)).toBeNull()
    expect(left()).not.toHaveAttribute('data-dragging')
    expect(left()).not.toHaveClass('transition-none')
  })

  it('dragging down to 100px closes the sheet', () => {
    down(500)
    move(832)
    expect(appStore.get(sheetDragPxAtom)).toBe(100)
    up(832)
    expect(appStore.get(drawerAtom)).toBeNull()
    expect(appStore.get(sheetDragPxAtom)).toBeNull()
  })

  it('pointercancel mid-drag clears the drag height and keeps the level', () => {
    down(500)
    move(400)
    expect(appStore.get(sheetDragPxAtom)).toBe(532)
    act(() => void fireEvent.pointerCancel(grab(), { clientY: 400, pointerId: 1 }))
    expect(appStore.get(sheetDragPxAtom)).toBeNull()
    expect(appStore.get(sheetLevelAtom)).toBe('half')
    expect(appStore.get(drawerAtom)).toBe('left')
  })

  it('renders no grab handle on desktop', () => {
    act(() => appStore.set(layoutModeAtom, 'desktop'))
    expect(screen.queryByRole('button', { name: LABEL })).toBeNull()
  })

  it('a move of exactly 6px is still a tap', () => {
    down(500)
    move(494)
    expect(appStore.get(sheetDragPxAtom)).toBeNull()
    up(494)
    expect(appStore.get(sheetLevelAtom)).toBe('full')
  })

  it('unmounting the grab mid-drag clears the drag height', () => {
    down(500)
    move(400)
    expect(appStore.get(sheetDragPxAtom)).toBe(532)
    act(() => appStore.set(layoutModeAtom, 'land'))
    expect(screen.queryByRole('button', { name: LABEL })).toBeNull()
    expect(appStore.get(sheetDragPxAtom)).toBeNull()
  })

  it('losing pointer capture mid-drag clears the drag height and keeps the level', () => {
    down(500)
    move(400)
    act(() => void fireEvent.lostPointerCapture(grab(), { pointerId: 1 }))
    expect(appStore.get(sheetDragPxAtom)).toBeNull()
    expect(appStore.get(sheetLevelAtom)).toBe('half')
    expect(left()).not.toHaveAttribute('data-dragging')
  })

  it('a keyboard click steps half → full', () => {
    act(() => void fireEvent.click(grab(), { detail: 0 }))
    expect(appStore.get(sheetLevelAtom)).toBe('full')
  })

  it('a pointer tap and its synthetic click step exactly once', () => {
    down(500)
    up(500)
    act(() => void fireEvent.click(grab(), { detail: 1 }))
    expect(appStore.get(sheetLevelAtom)).toBe('full')
  })
})
