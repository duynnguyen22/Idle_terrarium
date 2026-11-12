import { atom } from 'jotai'

export interface TourStep {
  uid: string
  text: string
}

export interface TourState {
  steps: TourStep[]
  i: number
}

// Transient UI overlays (growth board, time-away card, tour); never persisted.

export const growthBoardOpenAtom = atom(false)
/** Index of the away report the time-away card shows, or null when it is closed. */
export const awayIndexAtom = atom<number | null>(null)
export const tourAtom = atom<TourState | null>(null)

/** Opens the growth board and closes the time-away card. */
export const openGrowthBoardAtom = atom(null, (_get, set) => {
  set(growthBoardOpenAtom, true)
  set(awayIndexAtom, null)
})

/** Opens the time-away card at `index` (default 0) and closes the growth board. */
export const openAwayAtom = atom(null, (_get, set, index: number = 0) => {
  set(awayIndexAtom, index)
  set(growthBoardOpenAtom, false)
})

/** Starts a tour; an empty tour is a valid one: it shows the quiet caption. */
export const startTourAtom = atom(null, (_get, set, steps: TourStep[]) =>
  set(tourAtom, { steps, i: 0 }),
)

/** Advances the tour, ending it after the last step. */
export const nextTourAtom = atom(null, (get, set) => {
  const tour = get(tourAtom)
  if (!tour) return
  const i = tour.i + 1
  set(tourAtom, i >= tour.steps.length ? null : { steps: tour.steps, i })
})

/** Closes every overlay (tests and resets). */
export const resetOverlayAtom = atom(null, (_get, set) => {
  set(growthBoardOpenAtom, false)
  set(awayIndexAtom, null)
  set(tourAtom, null)
})
