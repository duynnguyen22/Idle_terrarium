import { appStore } from '@/store/appStore'
import { realTimeModeAtom, timeSpeedAtom } from '@/store/studio'
import { showToast } from '@/store/toast'

export type SpeedId = 'rt' | 'pause' | '1x' | '5x'

export const SPEEDS: Record<SpeedId, { rt: boolean; v: number; toast: string }> = {
  rt: { rt: true, v: 1, toast: 'Running at real-world speed' },
  pause: { rt: false, v: 0, toast: 'Simulation paused' },
  '1x': { rt: false, v: 1, toast: 'Standard 1× speed' },
  '5x': { rt: false, v: 5, toast: 'Fast-forward: 5× growth and creature speed' },
}

/** Which speed control is lit for the current clock settings, or '' for none. */
export const activeSpeed = (realTime: boolean, speed: number): SpeedId | '' =>
  speed === 0 ? 'pause' : speed === 5 ? '5x' : speed === 1 ? (realTime ? 'rt' : '1x') : ''

export const applySpeed = (id: string) => {
  const next = SPEEDS[id as SpeedId]
  if (!next) return // pressing the active item again keeps it selected
  appStore.set(realTimeModeAtom, next.rt)
  appStore.set(timeSpeedAtom, next.v)
  showToast(next.toast)
}
