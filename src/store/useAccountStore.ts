import { create, type StoreApi, type UseBoundStore } from 'zustand'
import { AuthError, authService } from '@/auth'
import type { AuthService, PublicUser, Session } from '@/auth'
import {
  createBackend,
  type GardenBackend,
  type GardenRecord,
  type JournalEntry,
} from '@/auth/backend'
import { mutateWorld, tryGetWorld } from '@/engine/engineBridge'
import { hasPool } from '@/engine/geometry'
import { restoreWorld, snapshotWorld } from '@/engine/persistence'
import { applyPreset } from '@/engine/presets'
import { envModel } from '@/engine/room'
import { createWorld, type EngineWorld } from '@/engine/world'
import { applyGardenSnapshot, gardenSummary, getGardenSnapshot } from './gardenSnapshot'
import { showToast } from './toastStore'
import { useStudioStore, type StudioStoreHook } from './useStudioStore'
import { useTelemetryStore } from './useTelemetryStore'

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

export interface AccountActions {
  initAccount(): Promise<void>
  beginSession(user: PublicUser, session: Session, o: { isNew: boolean }): Promise<void>
  endSession(message?: string): Promise<void>
  watchSession(): void
  scheduleCloudSave(): void
  flushCloudSave(): Promise<void>
  createGarden(kind: GardenStart, name: string): Promise<GardenRecord>
  openGarden(id: string): Promise<void>
  renameGarden(id: string, name: string): Promise<void>
  deleteGarden(id: string): Promise<void>
  /** Resolves true once the entry is stored; false when nothing is open or the write failed. */
  addJournalEntry(note: string, auto: boolean): Promise<boolean>
  refreshGardens(): Promise<void>
  refreshJournal(): Promise<void>
  openPanel(): void
  closePanel(): void
  openAuth(view: AuthView, data?: ViewData): void
  goView(view: AuthView, data?: ViewData): void
  setViewData(patch: ViewData): void
  /**
   * Replaces the signed-in user's public profile (after a profile edit). Ignored, returning false,
   * when nobody is signed in or a different user is, so a late reply cannot revive an ended session.
   */
  setUser(user: PublicUser): boolean
  /**
   * Closes the open terrarium without a final save: cancels the pending and retry saves, waits for a
   * write already under way, and returns the id that was open. Used before wiping the storage.
   */
  detachActiveGarden(): Promise<string | null>
  /** Reopens a terrarium closed by detachActiveGarden, while the session is still signed in. */
  attachActiveGarden(id: string | null): void
  setTab(tab: AccountTab): void
  setRenaming(id: string | null): void
  setConfirmDelete(id: string | null): void
  run(fn: () => Promise<void>): Promise<void>
  handleCloudError(e: unknown): void
}

export type AccountStore = AccountState & AccountActions
export type AccountStoreHook = UseBoundStore<StoreApi<AccountStore>>

export interface AccountDeps {
  auth: AuthService
  createBackend: (id: string) => GardenBackend
  studio: StudioStoreHook
  getWorld: () => EngineWorld | null
  toast: (m: string) => void
  now?: () => number
  /** Where the "sign-up prompt already shown" flag lives; defaults to localStorage. */
  welcomeStorage?: Storage
}

export const WELCOME_KEY = 'botanica_signin_prompt_seen_v1'
export const SAVE_DEBOUNCE_MS = 2500
const RETRY_MIN_MS = 4000
const RETRY_SPREAD_MS = 3000
const RESEND_WINDOW_MS = 30_000
const MAX_GARDEN_NAME = 60
const MAX_NOTE = 600
const MAX_ISSUES = 4
const DEFAULT_GARDEN_NAME = 'My terrarium'

const WELCOME_TEXT =
  'Create a free account to keep your terrariums, their progress and a growth journal.'
const EXPIRED_TEXT = 'Your session ended. Sign in again to keep saving.'
const REVOKED_TEXT = 'You were signed out on this device.'
const QUOTA_TOAST = 'Your storage is full. Delete an old terrarium or journal entries.'
const QUOTA_STATUS = 'Storage is full'

const endedBanner = (ended: string | undefined): ViewData['banner'] => ({
  kind: 'info',
  text: ended === 'expired' ? EXPIRED_TEXT : REVOKED_TEXT,
})

function errorCode(e: unknown): string | undefined {
  if (typeof e !== 'object' || e === null || !('code' in e)) return undefined
  return typeof e.code === 'string' ? e.code : undefined
}

function initialState(): AccountState {
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

/**
 * The account layer (spec 4293-4625): who is signed in, their terrariums and growth journal, and the
 * debounced save of the open terrarium. Not persisted: the session lives in the auth service and the
 * gardens in the backend. Dependencies are injected so tests run against fakes.
 */
export function createAccountStore(deps: AccountDeps): AccountStoreHook {
  const now = deps.now ?? (() => Date.now())
  const { studio } = deps

  return create<AccountStore>()((set, get) => {
    /** The pending retry after an `unavailable` write; at most one, cancelled on sign-out. */
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    /** The garden write under way, if any (it never rejects). */
    let inFlight: Promise<void> | null = null
    const clearRetryTimer = () => {
      if (retryTimer) clearTimeout(retryTimer)
      retryTimer = null
    }

    const clearSaveTimer = () => {
      const t = get().saveTimer
      if (t) clearTimeout(t)
      set({ saveTimer: null })
    }

    /** The open scene as a garden body: snapshot plus card summary. */
    const sceneBody = (name: string, createdAt: number, updatedAt: number) => {
      const s = studio.getState()
      const snapshot = getGardenSnapshot(s, deps.getWorld())
      const summary = gardenSummary(s, snapshot.worldSnapshot?.items ?? [])
      return { name, createdAt, updatedAt, summary, snapshot }
    }

    /** Writes one garden body and books the result; reports failures and retries `unavailable` ones. */
    const writeGarden = async (
      id: string,
      backend: GardenBackend,
      body: ReturnType<typeof sceneBody>,
      at: number,
    ) => {
      try {
        await backend.saveGarden(id, body)
        // A session that ended during the write keeps its cleared state.
        if (get().backend === backend)
          set((st) => ({
            gardens: st.gardens.some((x) => x.id === id)
              ? st.gardens.map((x) => (x.id === id ? { ...x, ...body } : x))
              : [{ id, ...body }, ...st.gardens],
            lastSaved: at,
            lastError: '',
          }))
      } catch (e) {
        // A write that fails after its session ended reports nothing and is not retried.
        if (get().backend === backend) {
          get().handleCloudError(e)
          if (errorCode(e) === 'unavailable') {
            clearRetryTimer()
            retryTimer = setTimeout(
              () => {
                retryTimer = null
                get().scheduleCloudSave()
              },
              RETRY_MIN_MS + Math.random() * RETRY_SPREAD_MS,
            )
          }
        }
      }
      set({ writing: false })
      if (get().pending) {
        set({ pending: false })
        get().scheduleCloudSave()
      }
    }

    /** Runs a scene edit on the live world, or on a scratch world built from the stored snapshot. */
    const editScene = (fn: (world: EngineWorld) => void) => {
      if (deps.getWorld()) {
        mutateWorld(fn)
        return
      }
      const scratch = createWorld()
      const saved = studio.getState().worldSnapshot
      if (saved) restoreWorld(scratch, saved)
      fn(scratch)
      studio.setState({ worldSnapshot: snapshotWorld(scratch) })
    }

    return {
      ...initialState(),

      async initAccount() {
        const { session, user, ended } = deps.auth.getSession()
        if (session && user) {
          await get().beginSession(user, session, { isNew: false })
          return
        }
        set({ phase: 'signedout' })
        if (ended === 'expired' || ended === 'revoked') {
          get().openAuth('signin', { banner: endedBanner(ended) })
          return
        }
        let seen = true
        try {
          const storage = deps.welcomeStorage ?? globalThis.localStorage
          seen = storage.getItem(WELCOME_KEY) === '1'
          storage.setItem(WELCOME_KEY, '1')
        } catch {
          seen = true
        }
        if (!seen) get().openAuth('signup', { banner: { kind: 'info', text: WELCOME_TEXT } })
      },

      async beginSession(user, session, { isNew }) {
        const backend = deps.createBackend(user.id)
        set({ user, session, backend, lastError: '' })
        try {
          const [profile, gardens] = await Promise.all([
            backend.getProfile(),
            backend.listGardens(),
          ])
          set({ gardens })
          const target = gardens.find((g) => g.id === profile.activeGardenId) ?? gardens[0]
          if (isNew || !target) {
            set({ phase: 'onboarding' })
            get().openAuth('onboarding')
            return
          }
          set({ activeId: target.id })
          if (target.snapshot) applyGardenSnapshot(target.snapshot, studio)
          set({ lastSaved: target.updatedAt || 0, phase: 'cloud' })
          await get().refreshJournal()
        } catch (e) {
          get().handleCloudError(e)
          set({ phase: 'cloud' })
        }
      },

      async endSession(message) {
        clearSaveTimer()
        clearRetryTimer()
        // The write starts synchronously, so the state can be cleared before it settles.
        const flushed = get().flushCloudSave()
        set({
          phase: 'signedout',
          user: null,
          session: null,
          backend: null,
          gardens: [],
          activeId: null,
          journal: [],
          pending: false,
          lastSaved: 0,
          lastError: '',
        })
        await flushed
        if (message) deps.toast(message)
      },

      watchSession() {
        const { phase } = get()
        if (phase !== 'cloud' && phase !== 'onboarding') return
        const { session, ended } = deps.auth.getSession()
        if (session) return
        void get().endSession()
        get().openAuth('signin', { banner: endedBanner(ended) })
      },

      scheduleCloudSave() {
        const s = get()
        if (s.phase !== 'cloud' || !s.activeId) return
        if (s.saveTimer) clearTimeout(s.saveTimer)
        const timer = setTimeout(() => {
          set({ saveTimer: null })
          void get().flushCloudSave()
        }, SAVE_DEBOUNCE_MS)
        set({ saveTimer: timer })
      },

      async flushCloudSave() {
        const s = get()
        const { activeId: id, backend } = s
        if (s.phase !== 'cloud' || !id || !backend) return
        if (s.writing) {
          set({ pending: true })
          return
        }
        set({ writing: true })
        const at = now()
        const g = s.gardens.find((x) => x.id === id)
        const body = sceneBody(g?.name || DEFAULT_GARDEN_NAME, g?.createdAt || at, at)
        const write = writeGarden(id, backend, body, at)
        inFlight = write
        await write
        if (inFlight === write) inFlight = null
      },

      async detachActiveGarden() {
        const prev = get().activeId
        // Cleared first so a write that finishes below does not schedule another save.
        set({ activeId: null, pending: false })
        clearSaveTimer()
        clearRetryTimer()
        if (inFlight) await inFlight
        return prev
      },

      attachActiveGarden(id) {
        if (get().phase !== 'cloud' || !get().backend) return
        set({ activeId: id })
      },

      async createGarden(kind, name) {
        const { backend, phase } = get()
        if (!backend) throw new Error('No account session')
        if (phase === 'cloud') {
          clearSaveTimer()
          await get().flushCloudSave()
        }
        // Close the open terrarium first, so no save can write the new scene over it, and keep its
        // scene so a failed create can put both back.
        const openId = await get().detachActiveGarden()
        const prev = getGardenSnapshot(studio.getState(), deps.getWorld())
        const id = backend.newGardenId()
        let saved = false
        let body: ReturnType<typeof sceneBody>
        let at: number
        try {
          if (kind === 'empty') {
            editScene((world) => {
              const cycleProgress = hasPool(studio.getState().waterSplit) ? 0 : 1
              world.items = []
              world.moldPatches = []
              world.surfaceGrains = []
              // The env flush is one-way (world -> store), so the live gauge is reset too.
              world.env.cycleProgress = cycleProgress
              studio.setState({ dayCount: 1, setupDay: 1, cycleProgress, selectedId: null })
            })
          } else if (kind === 'falls') {
            editScene((world) => {
              studio.setState({ dayCount: 1, selectedId: null })
              applyPreset(world, 'falls', studio.getState())
            })
          }
          at = now()
          body = sceneBody(name.trim().slice(0, MAX_GARDEN_NAME) || DEFAULT_GARDEN_NAME, at, at)
          await backend.saveGarden(id, body)
          saved = true
          await backend.setProfile({ activeGardenId: id })
        } catch (e) {
          // Best effort: a half-made terrarium should not linger in the list.
          if (saved) await backend.deleteGarden(id).catch(() => undefined)
          if (kind !== 'current') applyGardenSnapshot(prev, studio)
          get().attachActiveGarden(openId)
          throw e
        }
        set({ activeId: id, lastSaved: at, phase: 'cloud' })
        await get().refreshGardens()
        await get().refreshJournal()
        return { id, ...body }
      },

      async openGarden(id) {
        if (id === get().activeId) return
        clearSaveTimer()
        await get().flushCloudSave()
        const { backend, gardens } = get()
        const g = gardens.find((x) => x.id === id)
        if (!g || !backend) return
        set({ activeId: id })
        if (g.snapshot) applyGardenSnapshot(g.snapshot, studio)
        try {
          await backend.setProfile({ activeGardenId: id })
        } catch (e) {
          get().handleCloudError(e)
        }
        await get().refreshJournal()
        deps.toast(`Opened ${g.name}`)
      },

      async renameGarden(id, name) {
        set({ renaming: null })
        const { backend, gardens } = get()
        const g = gardens.find((x) => x.id === id)
        const next = name.trim().slice(0, MAX_GARDEN_NAME)
        if (!backend || !g || !next || next === g.name) return
        set((s) => ({ gardens: s.gardens.map((x) => (x.id === id ? { ...x, name: next } : x)) }))
        try {
          await backend.renameGarden(id, next)
        } catch (e) {
          get().handleCloudError(e)
        }
      },

      async deleteGarden(id) {
        set({ confirmDelete: null })
        const { backend, activeId } = get()
        // The open terrarium cannot be deleted (spec: no Delete button on the active row).
        if (!backend || id === activeId) return
        try {
          await backend.deleteGarden(id)
          await get().refreshGardens()
          deps.toast('Terrarium deleted')
        } catch (e) {
          get().handleCloudError(e)
        }
      },

      async addJournalEntry(note, auto) {
        const { phase, activeId, backend } = get()
        if (phase !== 'cloud' || !activeId || !backend) return false
        const s = studio.getState()
        const t = useTelemetryStore.getState().telemetry
        const m = envModel(s.room, s.hasLid)
        const world = deps.getWorld()
        const entry: Omit<JournalEntry, 'id'> = {
          at: now(),
          day: Math.floor(s.dayCount),
          auto,
          note: note.trim().slice(0, MAX_NOTE),
          metrics: {
            humidity: Math.round(t.humidity),
            temp: +t.temperature.toFixed(1),
            moisture: Math.round(t.soilMoisture),
            nutrients: Math.round(t.nutrients),
            water: m.water,
            air: m.airEff,
          },
          summary: gardenSummary(s, world ? world.items : (s.worldSnapshot?.items ?? [])),
          issues: t.careIssues
            .filter((i) => i.level === 'warn')
            .slice(0, MAX_ISSUES)
            .map((i) => i.text),
        }
        try {
          await backend.addJournal(activeId, entry)
          await get().refreshJournal()
          if (!auto) deps.toast('Logged in your growth journal')
          return true
        } catch (e) {
          get().handleCloudError(e)
          return false
        }
      },

      async refreshGardens() {
        const { backend } = get()
        if (!backend) return
        try {
          const gardens = await backend.listGardens()
          if (get().backend === backend) set({ gardens })
        } catch (e) {
          get().handleCloudError(e)
        }
      },

      async refreshJournal() {
        const { backend, activeId } = get()
        if (!backend || !activeId) {
          set({ journal: [] })
          return
        }
        try {
          const journal = await backend.listJournal(activeId)
          if (get().backend === backend && get().activeId === activeId) set({ journal })
        } catch (e) {
          get().handleCloudError(e)
        }
      },

      openPanel() {
        const { phase, view } = get()
        let next = view
        if (phase === 'checking') next = 'checking'
        else if (phase === 'signedout' && (view === 'account' || view === 'checking'))
          next = 'signin'
        set({ panelOpen: true, view: next })
      },

      closePanel() {
        // Onboarding must finish before the panel can close.
        if (get().phase === 'onboarding') return
        // An open rename or delete confirmation does not survive the panel closing.
        set({ panelOpen: false, renaming: null, confirmDelete: null })
      },

      openAuth(view, data = {}) {
        set({ view, viewData: { ...data } })
        get().openPanel()
      },

      goView(view, data = {}) {
        set((s) => ({ view, viewData: { ...s.viewData, ...data, error: null, fieldErrors: {} } }))
      },

      setViewData(patch) {
        set((s) => ({ viewData: { ...s.viewData, ...patch } }))
      },

      setUser(user) {
        if (get().user?.id !== user.id) return false
        set({ user })
        return true
      },
      setTab: (tab) => set({ tab }),
      setRenaming: (renaming) => set({ renaming }),
      setConfirmDelete: (confirmDelete) => set({ confirmDelete }),

      async run(fn) {
        if (get().busy) return
        set((s) => ({ busy: true, viewData: { ...s.viewData, error: null, fieldErrors: {} } }))
        try {
          await fn()
        } catch (e) {
          if (e instanceof AuthError) {
            const patch: ViewData = e.field
              ? { fieldErrors: { [e.field]: e.message } }
              : { error: e.message }
            if (e.code === 'locked') patch.lockedUntil = e.until
            if (e.code === 'not_verified') {
              set({ busy: false })
              get().goView('verify', {
                email: e.email,
                resendAt: now() + RESEND_WINDOW_MS,
                notice: e.message,
              })
              return
            }
            get().setViewData(patch)
          } else if (errorCode(e) === 'quota_exceeded') {
            get().setViewData({ error: QUOTA_TOAST })
          } else {
            get().setViewData({ error: 'Something went wrong. Try again.' })
            console.error(e)
          }
        }
        set({ busy: false })
      },

      handleCloudError(e) {
        if (errorCode(e) === 'quota_exceeded') {
          // Toast once on entering the storage-full state, not on every failed attempt.
          const already = get().lastError === QUOTA_STATUS
          set({ lastError: QUOTA_STATUS })
          if (!already) deps.toast(QUOTA_TOAST)
        } else {
          set({ lastError: 'Not saved yet, retrying' })
        }
      },
    }
  })
}

/** The account chip in the header (spec setAccountStatus). */
export function chipStatus(
  s: AccountState,
  now: number,
): { signedIn: boolean; name: string; text: string; q: 'idle' | 'err' | 'busy' | 'ok' } {
  const signedIn = s.phase === 'cloud' || s.phase === 'onboarding'
  if (!signedIn) {
    const checking = s.phase === 'checking'
    return {
      signedIn,
      name: checking ? 'One moment' : 'Sign in',
      text: checking ? '' : 'to save your work',
      q: 'idle',
    }
  }
  const name = s.user?.name ?? ''
  if (s.lastError) return { signedIn, name, text: s.lastError, q: 'err' }
  if (s.writing || s.saveTimer) return { signedIn, name, text: 'Saving…', q: 'busy' }
  return {
    signedIn,
    name,
    text: s.lastSaved ? `Saved ${timeAgo(s.lastSaved, now)}` : 'Synced',
    q: 'ok',
  }
}

export function timeAgo(ts: number, now: number = Date.now()): string {
  if (!ts) return 'not saved yet'
  const s = Math.round((now - ts) / 1000)
  if (s < 10) return 'just now'
  if (s < 60) return `${s} s ago`
  if (s < 3600) return `${Math.round(s / 60)} min ago`
  if (s < 86400) return `${Math.round(s / 3600)} h ago`
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function initialsOf(name: string): string {
  const parts = String(name || '?')
    .trim()
    .split(/\s+/)
  const first = (parts[0] || '?')[0] ?? '?'
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return (first + last).toUpperCase()
}

const AVATAR_COLORS = [
  '#2d6a4f',
  '#40704f',
  '#5b6f3a',
  '#2b6777',
  '#7a5c3e',
  '#6a4c7a',
  '#7a3e4e',
  '#3e5a7a',
] as const

export function avatarColor(id: string): string {
  let h = 0
  for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length] ?? AVATAR_COLORS[0]
}

export const useAccountStore = createAccountStore({
  auth: authService,
  // Late-bound so a reassigned `createBackend` (the cloud swap point) is picked up.
  createBackend: (id) => createBackend(id),
  studio: useStudioStore,
  getWorld: tryGetWorld,
  toast: showToast,
})
export default useAccountStore
