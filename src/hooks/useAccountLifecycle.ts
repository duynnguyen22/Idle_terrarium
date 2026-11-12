import { useEffect, useRef } from 'react'
import { AUTH_SESSION_KEY, AUTH_USERS_KEY } from '@/auth'
import { account, phaseAtom } from '@/store/account'
import { appStore } from '@/store/appStore'
import { persistedStudioAtom, type PersistedStudio } from '@/store/studio'

const WATCH_MS = 60_000
const AUTOSAVE_MS = 120_000

/**
 * Persisted keys the simulation writes on its own (telemetry.ts: the env seed and glass residue every
 * 5 s, cycle progress while a pool cycles). They do not schedule a save; they ride along on the next
 * edit-driven save or the 2-minute autosave. The world snapshot is committed only on user edits.
 */
const SIMULATION_KEYS: ReadonlySet<keyof PersistedStudio> = new Set([
  'envSeed',
  'cycleProgress',
  'mineralSpots',
])

/**
 * Session lifecycle: reads the stored session on mount, watches it for sign-outs from other tabs
 * or expiry, and keeps the open terrarium saved (on every persisted edit and every two minutes).
 */
export function useAccountLifecycle(): void {
  const started = useRef(false)

  useEffect(() => {
    // The ref survives StrictMode's simulated remount, so the session is read once.
    if (!started.current) {
      started.current = true
      void account.initAccount()
    }

    const watch = () => account.watchSession()
    const onStorage = (e: StorageEvent) => {
      if (e.key === AUTH_USERS_KEY || e.key === AUTH_SESSION_KEY) watch()
    }
    const watchId = setInterval(watch, WATCH_MS)
    window.addEventListener('storage', onStorage)

    const saveId = setInterval(() => {
      if (document.visibilityState === 'visible' && appStore.get(phaseAtom) === 'cloud')
        account.scheduleCloudSave()
    }, AUTOSAVE_MS)

    // A persisted key changed by reference -> debounced cloud save. Transient state and the
    // simulation's own writes do not. The persisted slice only notifies when one of its keys changed.
    let before = appStore.get(persistedStudioAtom)
    const unsubscribe = appStore.sub(persistedStudioAtom, () => {
      const next = appStore.get(persistedStudioAtom)
      const prev = before
      before = next
      const changed = (Object.keys(next) as (keyof typeof next)[]).some(
        (k) => !SIMULATION_KEYS.has(k) && next[k] !== prev[k],
      )
      if (changed) account.scheduleCloudSave()
    })

    return () => {
      clearInterval(watchId)
      clearInterval(saveId)
      window.removeEventListener('storage', onStorage)
      unsubscribe()
    }
  }, [])
}
