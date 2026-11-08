import { useEffect, useRef } from 'react'
import { AUTH_SESSION_KEY, AUTH_USERS_KEY } from '@/auth'
import { useAccountStore } from '@/store/useAccountStore'
import { partialize, useStudioStore, type PersistedStudio } from '@/store/useStudioStore'

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
      void useAccountStore.getState().initAccount()
    }

    const watch = () => useAccountStore.getState().watchSession()
    const onStorage = (e: StorageEvent) => {
      if (e.key === AUTH_USERS_KEY || e.key === AUTH_SESSION_KEY) watch()
    }
    const watchId = setInterval(watch, WATCH_MS)
    window.addEventListener('storage', onStorage)

    const saveId = setInterval(() => {
      const { phase, scheduleCloudSave } = useAccountStore.getState()
      if (document.visibilityState === 'visible' && phase === 'cloud') scheduleCloudSave()
    }, AUTOSAVE_MS)

    // A persisted key changed by reference -> debounced cloud save. Transient state and the
    // simulation's own writes do not.
    const unsubscribe = useStudioStore.subscribe((state, prev) => {
      const next = partialize(state)
      const before = partialize(prev)
      const changed = (Object.keys(next) as (keyof typeof next)[]).some(
        (k) => !SIMULATION_KEYS.has(k) && next[k] !== before[k],
      )
      if (changed) useAccountStore.getState().scheduleCloudSave()
    })

    return () => {
      clearInterval(watchId)
      clearInterval(saveId)
      window.removeEventListener('storage', onStorage)
      unsubscribe()
    }
  }, [])
}
