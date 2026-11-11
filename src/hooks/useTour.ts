import { useEffect } from 'react'
import { tryGetWorld } from '@/engine/engineBridge'
import { pingItem, TOUR_PING_MS } from '@/engine/marks'
import { useOverlayStore } from '@/store/useOverlayStore'

/** How long the "nothing to look at" caption stays when a visit has no live items. */
export const TOUR_QUIET_MS = 3200

/** Evening copy ("Tonight") from 17:00 until 05:00, local time. */
export function isEvening(d: Date = new Date()): boolean {
  const h = d.getHours()
  return h >= 17 || h < 5
}

/**
 * Drives the evening visit: each step pings its item for 4.2 s then moves on; an empty tour holds the quiet
 * caption for 3.2 s. Timers are cleared whenever the tour changes and on unmount.
 */
export function useTour(): void {
  const tour = useOverlayStore((s) => s.tour)

  useEffect(() => {
    if (!tour) return
    const { nextTour, endTour } = useOverlayStore.getState()
    const step = tour.steps[tour.i]
    if (!step) {
      const timer = setTimeout(endTour, TOUR_QUIET_MS)
      return () => clearTimeout(timer)
    }
    const world = tryGetWorld()
    if (world) pingItem(world, step.uid, TOUR_PING_MS)
    const timer = setTimeout(nextTour, TOUR_PING_MS)
    return () => clearTimeout(timer)
  }, [tour])
}
