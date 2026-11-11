import { create } from 'zustand'

export interface TourStep {
  uid: string
  text: string
}

interface OverlayState {
  growthBoardOpen: boolean
  awayIndex: number | null
  tour: { steps: TourStep[]; i: number } | null
  openGrowthBoard(): void
  closeGrowthBoard(): void
  openAway(index?: number): void
  closeAway(): void
  setAwayIndex(i: number): void
  startTour(steps: TourStep[]): void
  nextTour(): void
  endTour(): void
}

/** Transient UI overlays (growth board, time-away card, tour); never persisted. */
export const useOverlayStore = create<OverlayState>((set) => ({
  growthBoardOpen: false,
  awayIndex: null,
  tour: null,
  openGrowthBoard: () => set({ growthBoardOpen: true, awayIndex: null }),
  closeGrowthBoard: () => set({ growthBoardOpen: false }),
  openAway: (index = 0) => set({ awayIndex: index, growthBoardOpen: false }),
  closeAway: () => set({ awayIndex: null }),
  setAwayIndex: (i) => set({ awayIndex: i }),
  startTour: (steps) => set({ tour: steps.length > 0 ? { steps, i: 0 } : null }),
  nextTour: () =>
    set((s) => {
      if (!s.tour) return s
      const i = s.tour.i + 1
      return { tour: i >= s.tour.steps.length ? null : { steps: s.tour.steps, i } }
    }),
  endTour: () => set({ tour: null }),
}))
