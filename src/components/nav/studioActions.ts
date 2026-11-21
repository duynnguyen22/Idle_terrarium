import { startAudioFromGesture, stopAudio } from '@/services/audio'
import { exportSnapshotPng, snapshotFilename } from '@/lib/snapshot'
import { getTerrariumCanvas } from '@/lib/terrariumCanvas'
import { appStore } from '@/store/appStore'
import { audioEnabledAtom, dayCountAtom, relaxModeAtom } from '@/store/studio'
import { showToast } from '@/store/toast'

export const enterRelax = () => {
  appStore.set(relaxModeAtom, true)
  startAudioFromGesture()
}
export const toggleAudio = () => {
  // Starting must happen inside this click (gesture); stopping must not create an AudioContext.
  if (appStore.get(audioEnabledAtom)) stopAudio()
  else startAudioFromGesture()
}
export const takeSnapshot = async () => {
  const canvas = getTerrariumCanvas()
  if (!canvas) return
  const ok = await exportSnapshotPng(canvas, snapshotFilename(appStore.get(dayCountAtom)))
  if (ok) showToast('Snapshot saved')
}
