import type { PublicUser, Session } from '@/auth'
import type { GardenBackend, GardenRecord, JournalEntry } from '@/auth/backend'

export type AccountPhase = 'checking' | 'signedout' | 'onboarding' | 'cloud'
export type AuthView =
  | 'checking'
  | 'signin'
  | 'signup'
  | 'verify'
  | 'forgot'
  | 'reset'
  | 'resetDone'
  | 'magicSent'
  | 'provider'
  | 'onboarding'
  | 'account'
export type AccountTab = 'terrariums' | 'journal' | 'profile'
export type GardenStart = 'current' | 'falls' | 'empty'

/** Form values and messages for the open auth screen (spec account.viewData). */
export interface ViewData {
  email?: string
  password?: string
  name?: string
  code?: string
  remember?: boolean
  terms?: boolean
  provider?: string
  gname?: string
  start?: GardenStart
  current?: string
  next?: string
  confirmEmail?: string
  confirmDeleteAccount?: boolean
  saved?: 'profile' | 'password'
  banner?: { kind: 'info' | 'success' | 'error'; text: string } | null
  notice?: string
  error?: string | null
  fieldErrors?: Record<string, string>
  lockedUntil?: number
  resendAt?: number
}

/**
 * The account tabs' form values, cleared when a sign-out or deletion leaves the account view so
 * typed passwords, the confirm email and the display name do not follow onto the next auth screen.
 */
export const CLEARED_ACCOUNT_FORM: ViewData = {
  name: '',
  current: '',
  next: '',
  confirmEmail: '',
  confirmDeleteAccount: false,
  saved: undefined,
}

export interface AccountState {
  phase: AccountPhase
  user: PublicUser | null
  session: Session | null
  backend: GardenBackend | null
  gardens: GardenRecord[]
  activeId: string | null
  journal: JournalEntry[]
  saveTimer: ReturnType<typeof setTimeout> | null
  writing: boolean
  pending: boolean
  lastSaved: number
  lastError: string
  panelOpen: boolean
  view: AuthView
  viewData: ViewData
  tab: AccountTab
  confirmDelete: string | null
  renaming: string | null
  busy: boolean
}

export function initialAccountState(): AccountState {
  return {
    phase: 'checking',
    user: null,
    session: null,
    backend: null,
    gardens: [],
    activeId: null,
    journal: [],
    saveTimer: null,
    writing: false,
    pending: false,
    lastSaved: 0,
    lastError: '',
    panelOpen: false,
    view: 'signin',
    viewData: {},
    tab: 'terrariums',
    confirmDelete: null,
    renaming: null,
    busy: false,
  }
}
