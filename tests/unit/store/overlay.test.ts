import { createStore } from 'jotai'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  awayIndexAtom,
  growthBoardOpenAtom,
  nextTourAtom,
  openAwayAtom,
  openGrowthBoardAtom,
  resetOverlayAtom,
  startTourAtom,
  tourAtom,
} from '@/store/overlay'

const store = createStore()
const overlay = () => ({
  growthBoardOpen: store.get(growthBoardOpenAtom),
  awayIndex: store.get(awayIndexAtom),
  tour: store.get(tourAtom),
})

beforeEach(() => {
  // Leave every overlay open, so the reset below is what closes them.
  store.set(growthBoardOpenAtom, true)
  store.set(awayIndexAtom, 1)
  store.set(startTourAtom, [{ uid: 'a', text: 'one' }])
  store.set(resetOverlayAtom)
})

describe('overlay atoms', () => {
  it('starts closed', () => {
    expect(overlay()).toMatchObject({
      growthBoardOpen: false,
      awayIndex: null,
      tour: null,
    })
  })

  it('openAway closes the growth board and openGrowthBoard closes the away card', () => {
    store.set(openGrowthBoardAtom)
    expect(store.get(growthBoardOpenAtom)).toBe(true)
    store.set(openAwayAtom)
    expect(overlay()).toMatchObject({ growthBoardOpen: false, awayIndex: 0 })
    store.set(openAwayAtom, 2)
    expect(store.get(awayIndexAtom)).toBe(2)
    store.set(openGrowthBoardAtom)
    expect(overlay()).toMatchObject({ growthBoardOpen: true, awayIndex: null })
    store.set(growthBoardOpenAtom, false)
    expect(store.get(growthBoardOpenAtom)).toBe(false)
  })

  it('sets the away index and closes the away card', () => {
    store.set(openAwayAtom)
    store.set(awayIndexAtom, 3)
    expect(store.get(awayIndexAtom)).toBe(3)
    store.set(awayIndexAtom, null)
    expect(store.get(awayIndexAtom)).toBeNull()
  })

  it('walks a tour and ends it past the last step', () => {
    store.set(startTourAtom, [
      { uid: 'a', text: 'one' },
      { uid: 'b', text: 'two' },
    ])
    expect(store.get(tourAtom)?.i).toBe(0)
    store.set(nextTourAtom)
    expect(store.get(tourAtom)?.i).toBe(1)
    store.set(nextTourAtom)
    expect(store.get(tourAtom)).toBeNull()
  })

  it('starts an empty tour (it shows the quiet caption), and ending clears one', () => {
    store.set(startTourAtom, [])
    expect(store.get(tourAtom)).toEqual({ steps: [], i: 0 })
    store.set(startTourAtom, [{ uid: 'a', text: 'one' }])
    store.set(tourAtom, null)
    expect(store.get(tourAtom)).toBeNull()
  })
})
