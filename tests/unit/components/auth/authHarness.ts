import { render } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { vi } from 'vitest'
import type { AuthService, PublicUser, Session } from '@/auth'
import { createLocalBackend, type GardenBackend } from '@/auth/backend'
import { AuthEnvContext, useAccount } from '@/components/account/auth/authEnv'
import { AuthScreen } from '@/components/account/auth/AuthScreen'
import {
  createAccountStore,
  type AccountStoreHook,
  type AuthView,
  type ViewData,
} from '@/store/useAccountStore'
import { createStudioStore } from '@/store/useStudioStore'

export class MemoryStorage implements Storage {
  private map = new Map<string, string>()
  get length() {
    return this.map.size
  }
  clear() {
    this.map.clear()
  }
  getItem(key: string) {
    return this.map.get(key) ?? null
  }
  key(index: number) {
    return [...this.map.keys()][index] ?? null
  }
  removeItem(key: string) {
    this.map.delete(key)
  }
  setItem(key: string, value: string) {
    this.map.set(key, String(value))
  }
}

export const demoUser: PublicUser = {
  id: 'u_demo',
  name: 'Demo Gardener',
  email: 'demo@botanica.app',
  verified: true,
  provider: 'password',
  createdAt: 1,
}

export const demoSession: Session = {
  userId: 'u_demo',
  email: 'demo@botanica.app',
  version: 1,
  remember: true,
  createdAt: 1,
  expiresAt: Number.MAX_SAFE_INTEGER,
  device: 'Test on jsdom',
}

/** A fake auth service: every method the screens do not stub rejects loudly. */
export function fakeAuth(over: Partial<AuthService> = {}): AuthService {
  const unexpected = (name: string) => () => Promise.reject(new Error(`unexpected ${name}`))
  return {
    getSession: () => ({ session: null, user: null }),
    signIn: vi.fn(unexpected('signIn')),
    signUp: vi.fn(unexpected('signUp')),
    verifyEmail: vi.fn(unexpected('verifyEmail')),
    resendCode: vi.fn(unexpected('resendCode')),
    requestPasswordReset: vi.fn(unexpected('requestPasswordReset')),
    resetPassword: vi.fn(unexpected('resetPassword')),
    sendMagicLink: vi.fn(unexpected('sendMagicLink')),
    completeMagicLink: vi.fn(unexpected('completeMagicLink')),
    signInWithProvider: vi.fn(unexpected('signInWithProvider')),
    updateProfile: vi.fn(unexpected('updateProfile')),
    changePassword: vi.fn(unexpected('changePassword')),
    signOut: vi.fn(unexpected('signOut')),
    signOutEverywhere: vi.fn(unexpected('signOutEverywhere')),
    deleteAccount: vi.fn(unexpected('deleteAccount')),
    devCode: () => null,
    ...over,
  }
}

export interface Harness {
  store: AccountStoreHook
  auth: AuthService
  backend: GardenBackend
  toast: ReturnType<typeof vi.fn<(m: string) => void>>
}

function CurrentScreen() {
  const view = useAccount((s) => s.view)
  return createElement(AuthScreen, { view })
}

/** An isolated account store (fake auth, in-memory backend) with a signed-out, open panel. */
export function makeEnv(
  view: AuthView,
  { auth = fakeAuth(), viewData = {} }: { auth?: AuthService; viewData?: ViewData } = {},
): Harness {
  const backend = createLocalBackend('u_demo', new MemoryStorage())
  const toast = vi.fn<(m: string) => void>()
  const store = createAccountStore({
    auth,
    createBackend: () => backend,
    studio: createStudioStore(new MemoryStorage()),
    getWorld: () => null,
    toast,
    welcomeStorage: new MemoryStorage(),
  })
  store.setState({ phase: 'signedout', panelOpen: true, view, viewData })
  return { store, auth, backend, toast }
}

/** Renders `ui` inside the env's context. */
export function renderIn(env: Harness, ui: ReactNode) {
  const { store, auth, toast } = env
  return render(createElement(AuthEnvContext.Provider, { value: { store, auth, toast } }, ui))
}

/** Renders the current auth screen of an isolated env. */
export function renderAuth(view: AuthView, opts: { auth?: AuthService; viewData?: ViewData } = {}) {
  const env = makeEnv(view, opts)
  renderIn(env, createElement(CurrentScreen))
  return env
}
