import { atom, type Atom, type PrimitiveAtom, type Store } from 'jotai'
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
import { poolScore } from '@/engine/simulation/ecology'
import { envModel } from '@/engine/room'
import { createWorld, type EngineWorld } from '@/engine/world'
import { applyGardenSnapshot, gardenSummary, getGardenSnapshot } from './gardenSnapshot'
import { appStore } from './appStore'
import {
  dayCountAtom,
  patchStudioAtom,
  studioStateAtom,
  waterSplitAtom,
  worldSnapshotAtom,
} from './studio'
import { telemetryAtom } from './telemetry'
import { showToast } from './toast'

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
  addJournalEntry(
    note: string,
    auto: boolean,
    extra?: { events?: JournalEntry['events']; key?: string },
  ): Promise<boolean>
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
  /**
   * Books a backend failure on the chip. The storage-full toast fires once when a background save
   * enters that state; with `user` (a failed action the person just asked for) it fires every time.
   */
  handleCloudError(e: unknown, o?: { user?: boolean }): void
}

/** The account actions, bound to one jotai store (see createAccount). */
export type Account = AccountActions

export interface AccountDeps {
  auth: AuthService
  createBackend: (id: string) => GardenBackend
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

// ---------------------------------------------------------------------------------------------
// One atom per field. Components read these; only the account actions write them.
// ---------------------------------------------------------------------------------------------

type AccountAtoms = { [K in keyof AccountState]: PrimitiveAtom<AccountState[K]> }

const INITIAL = initialAccountState()
const ACCOUNT_KEYS = Object.keys(INITIAL) as (keyof AccountState)[]

const accountAtoms = Object.fromEntries(
  Object.entries(INITIAL).map(([k, v]) => [k, atom(v)]),
) as unknown as AccountAtoms

export const phaseAtom = accountAtoms.phase
export const userAtom = accountAtoms.user
export const sessionAtom = accountAtoms.session
export const backendAtom = accountAtoms.backend
export const gardensAtom = accountAtoms.gardens
export const activeIdAtom = accountAtoms.activeId
export const journalAtom = accountAtoms.journal
export const saveTimerAtom = accountAtoms.saveTimer
export const writingAtom = accountAtoms.writing
export const pendingAtom = accountAtoms.pending
export const lastSavedAtom = accountAtoms.lastSaved
export const lastErrorAtom = accountAtoms.lastError
export const panelOpenAtom = accountAtoms.panelOpen
export const viewAtom = accountAtoms.view
export const viewDataAtom = accountAtoms.viewData
export const tabAtom = accountAtoms.tab
export const confirmDeleteAtom = accountAtoms.confirmDelete
export const renamingAtom = accountAtoms.renaming
export const busyAtom = accountAtoms.busy

/** The whole account state as one object (imperative reads, chipStatus, tests). */
export const accountStateAtom = atom((get) => {
  const out = {} as Record<string, unknown>
  for (const k of ACCOUNT_KEYS) out[k] = get(accountAtoms[k] as Atom<unknown>)
  return out as unknown as AccountState
})

/** Writes several account fields at once; takes a patch or a function of the current state. */
export const patchAccountAtom = atom(
  null,
  (get, set, p: Partial<AccountState> | ((s: AccountState) => Partial<AccountState>)) => {
    const next = typeof p === 'function' ? p(get(accountStateAtom)) : p
    for (const k of Object.keys(next) as (keyof AccountState)[])
      if (Object.hasOwn(accountAtoms, k)) set(accountAtoms[k] as PrimitiveAtom<unknown>, next[k])
  },
)

/** Puts every account field back to its initial value (sign-in screen, nothing loaded). */
export const resetAccountAtom = atom(null, (_get, set) =>
  set(patchAccountAtom, initialAccountState()),
)

/**
 * The account layer (spec 4293-4625): who is signed in, their terrariums and growth journal, and the
 * debounced save of the open terrarium. Not persisted: the session lives in the auth service and the
 * gardens in the backend. Dependencies are injected so tests run against fakes;
 * the state lives in the atoms above, in `store`, which also holds the studio atoms it saves.
 */
export function createAccount(store: Store, deps: AccountDeps): Account {
  const now = deps.now ?? (() => Date.now())
  const state = () => store.get(accountStateAtom)
  const setAccount = (p: Partial<AccountState> | ((s: AccountState) => Partial<AccountState>)) =>
    store.set(patchAccountAtom, p)

  /** The pending retry after an `unavailable` write; at most one, cancelled on sign-out. */
  let retryTimer: ReturnType<typeof setTimeout> | null = null
  /** The garden write under way, if any (it never rejects). */
  let inFlight: Promise<void> | null = null
  const clearRetryTimer = () => {
    if (retryTimer) clearTimeout(retryTimer)
    retryTimer = null
  }

  const clearSaveTimer = () => {
    const t = state().saveTimer
    if (t) clearTimeout(t)
    setAccount({ saveTimer: null })
  }

  /** The open scene as a garden body: snapshot plus card summary. */
  const sceneBody = (name: string, createdAt: number, updatedAt: number) => {
    const s = store.get(studioStateAtom)
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
      if (state().backend === backend)
        setAccount((st) => ({
          gardens: st.gardens.some((x) => x.id === id)
            ? st.gardens.map((x) => (x.id === id ? { ...x, ...body } : x))
            : [{ id, ...body }, ...st.gardens],
          lastSaved: at,
          lastError: '',
        }))
    } catch (e) {
      // A write that fails after its session ended reports nothing and is not retried.
      if (state().backend === backend) {
        actions.handleCloudError(e)
        if (errorCode(e) === 'unavailable') {
          clearRetryTimer()
          retryTimer = setTimeout(
            () => {
              retryTimer = null
              actions.scheduleCloudSave()
            },
            RETRY_MIN_MS + Math.random() * RETRY_SPREAD_MS,
          )
        }
      }
    }
    setAccount({ writing: false })
    if (state().pending) {
      setAccount({ pending: false })
      actions.scheduleCloudSave()
    }
  }

  /** Runs a scene edit on the live world, or on a scratch world built from the stored snapshot. */
  const editScene = (fn: (world: EngineWorld) => void) => {
    if (deps.getWorld()) {
      mutateWorld(fn)
      return
    }
    const scratch = createWorld()
    const saved = store.get(worldSnapshotAtom)
    if (saved) restoreWorld(scratch, saved, store.get(dayCountAtom))
    fn(scratch)
    store.set(patchStudioAtom, { worldSnapshot: snapshotWorld(scratch) })
  }

  const actions: AccountActions = {
    async initAccount() {
      const { session, user, ended } = deps.auth.getSession()
      if (session && user) {
        await actions.beginSession(user, session, { isNew: false })
        return
      }
      setAccount({ phase: 'signedout' })
      if (ended === 'expired' || ended === 'revoked') {
        actions.openAuth('signin', { banner: endedBanner(ended) })
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
      if (!seen) actions.openAuth('signup', { banner: { kind: 'info', text: WELCOME_TEXT } })
    },

    async beginSession(user, session, { isNew }) {
      const backend = deps.createBackend(user.id)
      setAccount({ user, session, backend, lastError: '' })
      try {
        const [profile, gardens] = await Promise.all([backend.getProfile(), backend.listGardens()])
        setAccount({ gardens })
        const target = gardens.find((g) => g.id === profile.activeGardenId) ?? gardens[0]
        if (isNew || !target) {
          setAccount({ phase: 'onboarding' })
          actions.openAuth('onboarding')
          return
        }
        // Applying the snapshot runs the restored-world catch-up, which only records its report (and schedules
        // the cloud save) once the phase is 'cloud', so a sign-in from the panel enters it first. The startup
        // check ('checking') stays put: the engine defers its catch-up until the phase settles, after the apply.
        const settling = state().phase === 'checking'
        setAccount({
          activeId: target.id,
          lastSaved: target.updatedAt || 0,
          ...(settling ? {} : { phase: 'cloud' as const }),
        })
        if (target.snapshot) applyGardenSnapshot(target.snapshot, store)
        setAccount({ phase: 'cloud' })
        await actions.refreshJournal()
      } catch (e) {
        actions.handleCloudError(e)
        setAccount({ phase: 'cloud' })
      }
    },

    async endSession(message) {
      clearSaveTimer()
      clearRetryTimer()
      // The write starts synchronously, so the state can be cleared before it settles.
      const flushed = actions.flushCloudSave()
      setAccount({
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
      const { phase } = state()
      if (phase !== 'cloud' && phase !== 'onboarding') return
      const { session, ended } = deps.auth.getSession()
      if (session) return
      void actions.endSession()
      actions.openAuth('signin', { banner: endedBanner(ended) })
    },

    scheduleCloudSave() {
      const s = state()
      if (s.phase !== 'cloud' || !s.activeId) return
      if (s.saveTimer) clearTimeout(s.saveTimer)
      const timer = setTimeout(() => {
        setAccount({ saveTimer: null })
        void actions.flushCloudSave()
      }, SAVE_DEBOUNCE_MS)
      setAccount({ saveTimer: timer })
    },

    async flushCloudSave() {
      const s = state()
      const { activeId: id, backend } = s
      if (s.phase !== 'cloud' || !id || !backend) return
      if (s.writing) {
        setAccount({ pending: true })
        return
      }
      setAccount({ writing: true })
      const at = now()
      const g = s.gardens.find((x) => x.id === id)
      const body = sceneBody(g?.name || DEFAULT_GARDEN_NAME, g?.createdAt || at, at)
      const write = writeGarden(id, backend, body, at)
      inFlight = write
      await write
      if (inFlight === write) inFlight = null
    },

    async detachActiveGarden() {
      const prev = state().activeId
      // Cleared first so a write that finishes below does not schedule another save.
      setAccount({ activeId: null, pending: false })
      clearSaveTimer()
      clearRetryTimer()
      if (inFlight) await inFlight
      return prev
    },

    attachActiveGarden(id) {
      if (state().phase !== 'cloud' || !state().backend) return
      setAccount({ activeId: id })
    },

    async createGarden(kind, name) {
      const { backend, phase } = state()
      if (!backend) throw new Error('No account session')
      if (phase === 'cloud') {
        clearSaveTimer()
        await actions.flushCloudSave()
      }
      // Close the open terrarium first, so no save can write the new scene over it, and keep its
      // scene so a failed create can put both back.
      const openId = await actions.detachActiveGarden()
      const prev = getGardenSnapshot(store.get(studioStateAtom), deps.getWorld())
      const id = backend.newGardenId()
      let saved = false
      let body: ReturnType<typeof sceneBody>
      let at: number
      try {
        if (kind === 'empty') {
          editScene((world) => {
            const cycleProgress = hasPool(store.get(waterSplitAtom)) ? 0 : 1
            world.items = []
            world.mossTufts = []
            world.moldPatches = []
            world.surfaceGrains = []
            // Tank time restarts with the day counter (flushTelemetry derives dayCount from ecoTime).
            world.ecoTime = 0
            world.breed = {}
            // The env flush is one-way (world -> store), so the live gauge is reset too.
            world.env.cycleProgress = cycleProgress
            store.set(patchStudioAtom, {
              dayCount: 1,
              setupDay: 1,
              cycleProgress,
              selectedId: null,
            })
          })
        } else if (kind === 'falls') {
          editScene((world) => {
            world.ecoTime = 0
            world.breed = {}
            world.mossTufts = []
            store.set(patchStudioAtom, { dayCount: 1, selectedId: null })
            applyPreset(world, 'falls', store)
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
        if (kind !== 'current') applyGardenSnapshot(prev, store)
        actions.attachActiveGarden(openId)
        throw e
      }
      setAccount({ activeId: id, lastSaved: at, phase: 'cloud' })
      await actions.refreshGardens()
      await actions.refreshJournal()
      return { id, ...body }
    },

    async openGarden(id) {
      if (id === state().activeId) return
      clearSaveTimer()
      await actions.flushCloudSave()
      const { backend, gardens } = state()
      const g = gardens.find((x) => x.id === id)
      if (!g || !backend) return
      setAccount({ activeId: id })
      if (g.snapshot) applyGardenSnapshot(g.snapshot, store)
      try {
        await backend.setProfile({ activeGardenId: id })
      } catch (e) {
        actions.handleCloudError(e, { user: true })
      }
      await actions.refreshJournal()
      deps.toast(`Opened ${g.name}`)
    },

    async renameGarden(id, name) {
      setAccount({ renaming: null })
      const { backend, gardens } = state()
      const g = gardens.find((x) => x.id === id)
      const next = name.trim().slice(0, MAX_GARDEN_NAME)
      if (!backend || !g || !next || next === g.name) return
      setAccount((s) => ({
        gardens: s.gardens.map((x) => (x.id === id ? { ...x, name: next } : x)),
      }))
      try {
        await backend.renameGarden(id, next)
      } catch (e) {
        actions.handleCloudError(e, { user: true })
      }
    },

    async deleteGarden(id) {
      setAccount({ confirmDelete: null })
      const { backend, activeId } = state()
      // The open terrarium cannot be deleted (spec: no Delete button on the active row).
      if (!backend || id === activeId) return
      try {
        await backend.deleteGarden(id)
        await actions.refreshGardens()
        deps.toast('Terrarium deleted')
      } catch (e) {
        actions.handleCloudError(e, { user: true })
      }
    },

    async addJournalEntry(note, auto, extra) {
      const { phase, activeId, backend } = state()
      if (phase !== 'cloud' || !activeId || !backend) return false
      if (extra?.key !== undefined && extra.key === state().journal[0]?.key) return false
      const s = store.get(studioStateAtom)
      const t = store.get(telemetryAtom)
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
          // A tank without a pool has no pool score (its cycle progress sits at 1, which would read "Pool 100").
          ...(hasPool(s.waterSplit) ? { pool: Math.round(poolScore(s.cycleProgress)) } : {}),
        },
        summary: gardenSummary(s, world ? world.items : (s.worldSnapshot?.items ?? [])),
        issues: t.careIssues
          .filter((i) => i.level === 'warn')
          .slice(0, MAX_ISSUES)
          .map((i) => i.text),
        ...(extra?.events ? { events: extra.events } : {}),
        ...(extra?.key !== undefined ? { key: extra.key } : {}),
      }
      try {
        await backend.addJournal(activeId, entry)
        await actions.refreshJournal()
        if (!auto) deps.toast('Logged in your growth journal')
        return true
      } catch (e) {
        actions.handleCloudError(e, { user: !auto })
        return false
      }
    },

    async refreshGardens() {
      const { backend } = state()
      if (!backend) return
      try {
        const gardens = await backend.listGardens()
        if (state().backend === backend) setAccount({ gardens })
      } catch (e) {
        actions.handleCloudError(e)
      }
    },

    async refreshJournal() {
      const { backend, activeId } = state()
      if (!backend || !activeId) {
        setAccount({ journal: [] })
        return
      }
      try {
        const journal = await backend.listJournal(activeId)
        if (state().backend === backend && state().activeId === activeId) setAccount({ journal })
      } catch (e) {
        actions.handleCloudError(e)
      }
    },

    openPanel() {
      const { phase, view } = state()
      let next = view
      if (phase === 'checking') next = 'checking'
      else if (phase === 'signedout' && (view === 'account' || view === 'checking')) next = 'signin'
      setAccount({ panelOpen: true, view: next })
    },

    closePanel() {
      // Onboarding must finish before the panel can close.
      if (state().phase === 'onboarding') return
      // An open rename or delete confirmation does not survive the panel closing.
      setAccount({ panelOpen: false, renaming: null, confirmDelete: null })
    },

    openAuth(view, data = {}) {
      setAccount({ view, viewData: { ...data } })
      actions.openPanel()
    },

    goView(view, data = {}) {
      setAccount((s) => ({
        view,
        viewData: { ...s.viewData, ...data, error: null, fieldErrors: {} },
      }))
    },

    setViewData(patch) {
      setAccount((s) => ({ viewData: { ...s.viewData, ...patch } }))
    },

    setUser(user) {
      if (state().user?.id !== user.id) return false
      setAccount({ user })
      return true
    },
    setTab: (tab) => setAccount({ tab }),
    setRenaming: (renaming) => setAccount({ renaming }),
    setConfirmDelete: (confirmDelete) => setAccount({ confirmDelete }),

    async run(fn) {
      if (state().busy) return
      setAccount((s) => ({ busy: true, viewData: { ...s.viewData, error: null, fieldErrors: {} } }))
      try {
        await fn()
      } catch (e) {
        if (e instanceof AuthError) {
          const patch: ViewData = e.field
            ? { fieldErrors: { [e.field]: e.message } }
            : { error: e.message }
          if (e.code === 'locked') patch.lockedUntil = e.until
          if (e.code === 'not_verified') {
            setAccount({ busy: false })
            actions.goView('verify', {
              email: e.email,
              resendAt: now() + RESEND_WINDOW_MS,
              notice: e.message,
            })
            return
          }
          actions.setViewData(patch)
        } else if (errorCode(e) === 'quota_exceeded') {
          actions.setViewData({ error: QUOTA_TOAST })
        } else {
          actions.setViewData({ error: 'Something went wrong. Try again.' })
          console.error(e)
        }
      }
      setAccount({ busy: false })
    },

    handleCloudError(e, o) {
      if (errorCode(e) === 'quota_exceeded') {
        // Background saves toast once on entering the storage-full state, not on every retry;
        // an action the person just took always says why it failed.
        const already = state().lastError === QUOTA_STATUS
        setAccount({ lastError: QUOTA_STATUS })
        if (o?.user || !already) deps.toast(QUOTA_TOAST)
      } else {
        setAccount({ lastError: 'Not saved yet, retrying' })
      }
    },
  }
  return actions
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

/** The app's account, bound to the app store. */
export const account: Account = createAccount(appStore, {
  auth: authService,
  // Late-bound so a reassigned `createBackend` (the cloud swap point) is picked up.
  createBackend: (id) => createBackend(id),
  getWorld: tryGetWorld,
  toast: showToast,
})
