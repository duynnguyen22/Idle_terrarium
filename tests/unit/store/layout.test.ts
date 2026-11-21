import { createStore } from 'jotai'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  activeSheetAtom,
  isHandheldAtom,
  layoutModeAtom,
  layoutModeFor,
  openSheetAtom,
  peekBuildSheetAtom,
  sheetDragPxAtom,
  sheetHeightPxAtom,
  sheetLevelAtom,
  stagePadPxAtom,
  viewportHeightAtom,
} from '@/store/layout'
import { awayIndexAtom, drawerAtom, growthBoardOpenAtom, resetOverlayAtom } from '@/store/overlay'

let store = createStore()
beforeEach(() => {
  store = createStore()
})

describe('layoutModeFor', () => {
  it('picks the mode from the two media queries', () => {
    expect(layoutModeFor(true, true)).toBe('land')
    expect(layoutModeFor(true, false)).toBe('phone')
    expect(layoutModeFor(false, false)).toBe('desktop')
  })
})

describe('layout atoms', () => {
  it('is handheld unless the mode is desktop', () => {
    expect(store.get(isHandheldAtom)).toBe(false)
    store.set(layoutModeAtom, 'land')
    expect(store.get(isHandheldAtom)).toBe(true)
  })

  it('opening build and health sets the drawer and the level', () => {
    store.set(openSheetAtom, 'build', 'peek')
    expect(store.get(drawerAtom)).toBe('left')
    expect(store.get(sheetLevelAtom)).toBe('peek')
    expect(store.get(activeSheetAtom)).toBe('build')
    store.set(openSheetAtom, 'health')
    expect(store.get(drawerAtom)).toBe('right')
    expect(store.get(sheetLevelAtom)).toBe('half')
    expect(store.get(activeSheetAtom)).toBe('health')
  })

  it('opening growth replaces build and closes the away card', () => {
    store.set(awayIndexAtom, 0)
    store.set(openSheetAtom, 'build')
    store.set(openSheetAtom, 'growth')
    expect(store.get(drawerAtom)).toBeNull()
    expect(store.get(growthBoardOpenAtom)).toBe(true)
    expect(store.get(awayIndexAtom)).toBeNull()
    expect(store.get(activeSheetAtom)).toBe('growth')
  })

  it('switching away from growth closes the growth board', () => {
    store.set(openSheetAtom, 'growth')
    store.set(openSheetAtom, 'build')
    expect(store.get(growthBoardOpenAtom)).toBe(false)
    expect(store.get(activeSheetAtom)).toBe('build')
    store.set(openSheetAtom, null)
    expect(store.get(drawerAtom)).toBeNull()
    expect(store.get(activeSheetAtom)).toBeNull()
  })

  it('sheet height is 0 on desktop and follows the viewport on phone', () => {
    store.set(openSheetAtom, 'build')
    expect(store.get(sheetHeightPxAtom)).toBe(0)
    store.set(layoutModeAtom, 'phone')
    store.set(viewportHeightAtom, 800)
    expect(store.get(sheetHeightPxAtom)).toBe(432)
    store.set(viewportHeightAtom, 600)
    expect(store.get(sheetHeightPxAtom)).toBe(324)
  })

  it('sheet height is 0 on a phone with no sheet open', () => {
    store.set(layoutModeAtom, 'phone')
    expect(store.get(sheetHeightPxAtom)).toBe(0)
  })

  it('stage pad is 0 at full and while closed', () => {
    store.set(layoutModeAtom, 'phone')
    expect(store.get(stagePadPxAtom)).toBe(0)
    store.set(openSheetAtom, 'build', 'full')
    expect(store.get(stagePadPxAtom)).toBe(0)
    store.set(openSheetAtom, 'build', 'half')
    expect(store.get(stagePadPxAtom)).toBe(432)
  })

  it('stage pad keeps the level height while dragging', () => {
    store.set(layoutModeAtom, 'phone')
    store.set(openSheetAtom, 'build')
    store.set(sheetDragPxAtom, 300)
    expect(store.get(sheetHeightPxAtom)).toBe(300)
    expect(store.get(stagePadPxAtom)).toBe(432)
  })

  it('peek only acts on a phone with build open', () => {
    store.set(openSheetAtom, 'build')
    store.set(peekBuildSheetAtom)
    expect(store.get(sheetLevelAtom)).toBe('half')
    store.set(layoutModeAtom, 'phone')
    store.set(openSheetAtom, 'health')
    store.set(peekBuildSheetAtom)
    expect(store.get(sheetLevelAtom)).toBe('half')
    store.set(openSheetAtom, 'build')
    store.set(peekBuildSheetAtom)
    expect(store.get(sheetLevelAtom)).toBe('peek')
  })

  it('resetOverlayAtom clears the drawer', () => {
    store.set(openSheetAtom, 'build')
    store.set(resetOverlayAtom)
    expect(store.get(drawerAtom)).toBeNull()
  })
})
