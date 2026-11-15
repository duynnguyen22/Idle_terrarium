import { mutateWorld } from '@/engine/engineBridge'
import { applyPreset } from '@/engine/presets'
import { appStore } from '@/store/appStore'
import { openAwayAtom } from '@/store/overlay'
import { awayLogAtom, selectedIdAtom } from '@/store/studio'
import { showToast } from '@/store/toast'

export const rebuildFalls = () => {
  let message = ''
  mutateWorld((w) => {
    message = applyPreset(w, 'falls')
  })
  showToast(message)
}
export const clearAll = () => {
  mutateWorld((w) => {
    w.items = []
    // Moss carpet and breeding progress belong to the plants and animals just removed.
    w.mossTufts = []
    w.breed = {}
  })
  appStore.set(selectedIdAtom, null)
  showToast('Cleared all specimens')
}

export const showLastSummary = () => {
  if (appStore.get(awayLogAtom).length === 0) {
    showToast('No time away recorded yet. Come back later, or preview a gap below.')
  } else appStore.set(openAwayAtom, 0)
}

export const GAPS: { label: string; hours: number }[] = [
  { label: '8 h', hours: 8 },
  { label: '1 day', hours: 24 },
  { label: '3 days', hours: 72 },
  { label: '1 week', hours: 168 },
]

export const ITEM = 'px-3 py-2 text-xs font-medium'
