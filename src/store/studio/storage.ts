import type { Store } from 'jotai'
import { importPrototypeSave } from '../importPrototypeSave'
import {
  migrate,
  sanitizeAwayLog,
  sanitizeBackdropHaze,
  sanitizeMusicVolume,
  sanitizePace,
  sanitizeSoundPreset,
  sanitizeRoom,
} from '../migrations'
import { patchStudioAtom, persistedStudioAtom, STUDIO_KEYS } from './atoms'
import { STUDIO_STORAGE_KEY, STUDIO_VERSION, type PersistedStudio } from './persisted'
import type { StudioState } from './state'

// ---------------------------------------------------------------------------------------------
// Persistence: the same key and `{ state, version }` envelope the zustand persist middleware
// wrote, so existing saves load unchanged.
// ---------------------------------------------------------------------------------------------

/** Sanitizes the fields a hand-edited or current-version save could carry out of range. */
function sanitizeSaved(saved: Partial<StudioState>): Partial<StudioState> {
  const out = { ...saved }
  if (Object.hasOwn(saved, 'room')) out.room = sanitizeRoom(saved.room)
  if (Object.hasOwn(saved, 'backdropHaze'))
    out.backdropHaze = sanitizeBackdropHaze(saved.backdropHaze)
  if (Object.hasOwn(saved, 'musicVolume')) out.musicVolume = sanitizeMusicVolume(saved.musicVolume)
  if (Object.hasOwn(saved, 'soundPreset')) out.soundPreset = sanitizeSoundPreset(saved.soundPreset)
  if (Object.hasOwn(saved, 'pace')) out.pace = sanitizePace(saved.pace)
  if (Object.hasOwn(saved, 'awayLog')) out.awayLog = sanitizeAwayLog(saved.awayLog)
  return out
}

function writeSave(storage: Storage, state: PersistedStudio): void {
  try {
    storage.setItem(STUDIO_STORAGE_KEY, JSON.stringify({ state, version: STUDIO_VERSION }))
  } catch {
    // Storage full or blocked: the session keeps working, it just will not survive a reload.
  }
}

/**
 * Loads the studio save from `storage` into `store`, then writes every later change of a persisted
 * field back. When the key is absent and a prototype save parses, its mapped values seed the state
 * (the old key is never deleted). Returns the unsubscribe.
 */
export function bindStudioStorage(store: Store, storage: Storage): () => void {
  let raw: string | null = null
  try {
    raw = storage.getItem(STUDIO_STORAGE_KEY)
  } catch {
    raw = null
  }

  let migrated = false
  if (raw === null) {
    let seed: Partial<StudioState> = {}
    try {
      seed = importPrototypeSave(storage) ?? {}
    } catch {
      seed = {}
    }
    store.set(patchStudioAtom, seed)
  } else {
    let saved: Partial<StudioState> = {}
    try {
      const parsed: unknown = JSON.parse(raw)
      const env = (typeof parsed === 'object' && parsed !== null ? parsed : {}) as {
        state?: unknown
        version?: number
      }
      const version = typeof env.version === 'number' ? env.version : 0
      if (version !== STUDIO_VERSION) {
        // `migrate` runs on a version change only, like the persist middleware.
        saved = migrate(env.state, version) as Partial<StudioState>
        migrated = true
      } else if (typeof env.state === 'object' && env.state !== null) {
        saved = env.state as Partial<StudioState>
      }
    } catch {
      saved = {}
    }
    // A current-version save is sanitized here; only known fields reach the store.
    const clean = sanitizeSaved(saved)
    const patch: Partial<StudioState> = {}
    for (const k of STUDIO_KEYS)
      if (Object.hasOwn(clean, k)) (patch as Record<string, unknown>)[k] = clean[k]
    store.set(patchStudioAtom, patch)
  }

  // Like the persist middleware: a migrated save is written back at once; otherwise only changes are.
  if (migrated) writeSave(storage, store.get(persistedStudioAtom))
  return store.sub(persistedStudioAtom, () => writeSave(storage, store.get(persistedStudioAtom)))
}
