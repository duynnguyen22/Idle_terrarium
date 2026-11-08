import { createContext, useContext, useEffect, useState } from 'react'
import { authService, type AuthService } from '@/auth'
import { showToast } from '@/store/toastStore'
import {
  useAccountStore,
  type AccountStore,
  type AccountStoreHook,
  type ViewData,
} from '@/store/useAccountStore'

/** How long before another code or link can be requested. */
export const RESEND_WINDOW_MS = 30_000

/**
 * What the account dialog, chip and auth screens talk to. Production uses the app singletons;
 * tests inject fakes. `auth` and `toast` must be the same objects `store` was created with
 * (its `deps.auth` / `deps.toast`): the screens call them directly while the store's own actions
 * use the deps, and two different services would split the session and the messages.
 */
export interface AuthEnv {
  store: AccountStoreHook
  auth: AuthService
  toast: (message: string) => void
}

export const AuthEnvContext = createContext<AuthEnv>({
  store: useAccountStore,
  auth: authService,
  toast: showToast,
})

export function useAuthEnv(): AuthEnv {
  return useContext(AuthEnvContext)
}

/** Reads the account store from the env with a selector (the module store unless a test injects one). */
export function useAccount<T>(selector: (s: AccountStore) => T): T {
  const { store } = useAuthEnv()
  return store(selector)
}

/** The viewData keys that hold free text, so a field can read and write them as strings. */
export type TextKey = {
  [K in keyof ViewData]-?: string extends NonNullable<ViewData[K]> ? K : never
}[keyof ViewData]

/** A one-key viewData patch for a text field. */
export function textPatch(name: TextKey, value: string): ViewData {
  const patch: ViewData = {}
  patch[name] = value
  return patch
}

/**
 * Whole seconds left until `until` (0 once it has passed), re-rendering every second while it
 * counts. Callers key the component by `until` so a new deadline starts from a fresh clock.
 */
export function useSecondsLeft(until: number): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (until <= Date.now()) return
    const id = setInterval(() => {
      const t = Date.now()
      setNow(t)
      if (t >= until) clearInterval(id)
    }, 1000)
    return () => clearInterval(id)
  }, [until])
  return Math.max(0, Math.ceil((until - now) / 1000))
}
