import { useEffect, useRef } from 'react'
import { AUTH_SESSION_KEY, AUTH_USERS_KEY } from '@/auth'
import { useAccountStore } from '@/store/useAccountStore'
import { partialize, useStudioStore } from '@/store/useStudioStore'

const WATCH_MS = 60_000
const AUTOSAVE_MS = 120_000

/**
 * Session lifecycle: reads the stored session on mount, watches it for sign-outs from other tabs
 * or expiry, and keeps the open terrarium saved (on every persisted change and every two minutes).
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

    // Persisted slice changed (any key, by reference) -> debounced cloud save. Transient state does not.
    const unsubscribe = useStudioStore.subscribe((state, prev) => {
      const next = partialize(state)
      const before = partialize(prev)
      const changed = (Object.keys(next) as (keyof typeof next)[]).some(
        (k) => next[k] !== before[k],
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
