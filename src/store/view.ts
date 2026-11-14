import { atom, type Store } from 'jotai'

/**
 * Device drawing preferences. They describe this screen, not the garden, so they live under their
 * own key: the studio save, its version and the cloud snapshots never see them.
 */
export const VIEW_STORAGE_KEY = 'botanica_view_v1'

export const depthOnAtom = atom(true)
export const smoothDrawingAtom = atom(true)
export const perfHudAtom = atom(false)
/** Current camera zoom in percent (not saved). */
export const zoomPctAtom = atom(100)
/** Frame-rate readout text (not saved). */
export const perfTextAtom = atom('')

const SAVED = [
  ['depth', depthOnAtom],
  ['smooth', smoothDrawingAtom],
  ['hud', perfHudAtom],
] as const

/** Loads the saved prefs into `store` and writes every later change back. Returns the unsubscribe. */
export function hydrateViewPrefs(store: Store, storage: Storage): () => void {
  let saved: Record<string, unknown> = {}
  try {
    const parsed: unknown = JSON.parse(storage.getItem(VIEW_STORAGE_KEY) ?? '{}')
    if (typeof parsed === 'object' && parsed !== null) saved = parsed as Record<string, unknown>
  } catch {
    saved = {}
  }
  for (const [key, a] of SAVED) {
    const v = saved[key]
    if (typeof v === 'boolean') store.set(a, v)
  }

  const write = () => {
    const out: Record<string, boolean> = {}
    for (const [key, a] of SAVED) out[key] = store.get(a)
    try {
      storage.setItem(VIEW_STORAGE_KEY, JSON.stringify(out))
    } catch {
      // Storage full or blocked: the preference holds for this session only.
    }
  }
  const offs = SAVED.map(([, a]) => store.sub(a, write))
  return () => offs.forEach((off) => off())
}
