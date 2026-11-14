import { createStore } from 'jotai'
import { describe, expect, it } from 'vitest'
import {
  VIEW_STORAGE_KEY,
  depthOnAtom,
  hydrateViewPrefs,
  perfHudAtom,
  perfTextAtom,
  smoothDrawingAtom,
  zoomPctAtom,
} from '@/store/view'

function memoryStorage(init: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(init))
  return {
    get length() {
      return data.size
    },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, String(v)),
  }
}

const blocked = () => {
  throw new Error('blocked')
}
const throwing: Storage = {
  length: 0,
  clear: blocked,
  getItem: blocked,
  key: () => null,
  removeItem: blocked,
  setItem: blocked,
}

describe('view prefs', () => {
  it('defaults to depth on, smooth on, readout off', () => {
    const store = createStore()
    hydrateViewPrefs(store, memoryStorage())
    expect(store.get(depthOnAtom)).toBe(true)
    expect(store.get(smoothDrawingAtom)).toBe(true)
    expect(store.get(perfHudAtom)).toBe(false)
    expect(store.get(zoomPctAtom)).toBe(100)
    expect(store.get(perfTextAtom)).toBe('')
  })

  it('loads saved prefs and falls back on a non-boolean or broken JSON', () => {
    const a = createStore()
    hydrateViewPrefs(
      a,
      memoryStorage({
        [VIEW_STORAGE_KEY]: JSON.stringify({ depth: false, smooth: 'no', hud: true }),
      }),
    )
    expect(a.get(depthOnAtom)).toBe(false)
    expect(a.get(smoothDrawingAtom)).toBe(true)
    expect(a.get(perfHudAtom)).toBe(true)

    const b = createStore()
    hydrateViewPrefs(b, memoryStorage({ [VIEW_STORAGE_KEY]: '{oops' }))
    expect(b.get(depthOnAtom)).toBe(true)
    expect(b.get(smoothDrawingAtom)).toBe(true)
    expect(b.get(perfHudAtom)).toBe(false)

    const c = createStore()
    hydrateViewPrefs(c, memoryStorage({ [VIEW_STORAGE_KEY]: 'null' }))
    expect(c.get(depthOnAtom)).toBe(true)
  })

  it('writes on change and survives a storage that throws', () => {
    const storage = memoryStorage()
    const store = createStore()
    const off = hydrateViewPrefs(store, storage)
    store.set(smoothDrawingAtom, false)
    store.set(perfHudAtom, true)
    expect(JSON.parse(storage.getItem(VIEW_STORAGE_KEY) ?? '{}')).toEqual({
      depth: true,
      smooth: false,
      hud: true,
    })
    // Transient atoms are not saved.
    store.set(zoomPctAtom, 250)
    store.set(perfTextAtom, '60 fps')
    expect(Object.keys(JSON.parse(storage.getItem(VIEW_STORAGE_KEY) ?? '{}'))).toEqual([
      'depth',
      'smooth',
      'hud',
    ])
    off()
    store.set(depthOnAtom, false)
    expect(JSON.parse(storage.getItem(VIEW_STORAGE_KEY) ?? '{}').depth).toBe(true)

    const s2 = createStore()
    expect(() => hydrateViewPrefs(s2, throwing)).not.toThrow()
    expect(s2.get(depthOnAtom)).toBe(true)
    expect(() => s2.set(depthOnAtom, false)).not.toThrow()
    expect(s2.get(depthOnAtom)).toBe(false)
  })
})
