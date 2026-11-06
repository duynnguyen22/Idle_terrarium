import type { LightingId } from '@/data/types'
import type { StudioStore } from '@/store/useStudioStore'

/** Prototype autoLightSync thresholds: dawn 5.5-8.5, day 8.5-17.5, twilight 17.5-20, otherwise night. */
export function lightingForHour(hour: number): LightingId {
  if (hour >= 5.5 && hour < 8.5) return 'dawn'
  if (hour >= 8.5 && hour < 17.5) return 'sunlight'
  if (hour >= 17.5 && hour < 20.0) return 'twilight'
  return 'night'
}

export function hourOfDay(now: Date): number {
  return now.getHours() + now.getMinutes() / 60
}

/**
 * Auto lighting sync. The prototype always keys it off the real clock hour (which is what
 * `realTimeMode` means); `timeSpeed` does not affect the clock. The store setter is only called when the
 * phase actually changes. Returns true when it wrote.
 */
export function advanceClock(store: StudioStore, now: Date = new Date()): boolean {
  if (!store.autoLightSync) return false
  const next = lightingForHour(hourOfDay(now))
  if (next === store.lighting) return false
  store.setLighting(next)
  return true
}
