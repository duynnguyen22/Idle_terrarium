import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { StoreApi, UseBoundStore } from 'zustand'
import { BackendError, createLocalBackend, type GardenBackend } from '@/auth/backend'
import { AuthError, type AuthService, type PublicUser, type Session } from '@/auth'
import type { PlacedItem } from '@/data/types'
import { registerWorld, tryGetWorld, unregisterWorld } from '@/engine/engineBridge'
import { envModel } from '@/engine/room'
import { createWorld, type EngineWorld } from '@/engine/world'
import { getGardenSnapshot, gardenSummary } from '@/store/gardenSnapshot'
import {
  avatarColor,
  chipStatus,
  createAccountStore,
  initialsOf,
  timeAgo,
  type AccountActions,
  type AccountState,
} from '@/store/useAccountStore'
import { createStudioStore, type StudioStoreHook } from '@/store/useStudioStore'
import { createDefaultTelemetry, useTelemetryStore } from '@/store/useTelemetryStore'

class MemoryStorage implements Storage {
  private map = new Map<string, string>()
  get length() {
    return this.map.size
  }
  clear() {
    this.map.clear()
  }
  getItem(key: string) {
    return this.map.has(key) ? this.map.get(key)! : null
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

type AccountStore = UseBoundStore<StoreApi<AccountState & AccountActions>>

const NOW = Date.UTC(2026, 10, 8, 12, 0, 0)
const WELCOME =
  'Create a free account to keep your terrariums, their progress and a growth journal.'
const EXPIRED = 'Your session ended. Sign in again to keep saving.'
const REVOKED = 'You were signed out on this device.'

const demoUser: PublicUser = {
  id: 'u_demo',
  name: 'Demo Gardener',
  email: 'demo@botanica.app',
  verified: true,
  provider: 'password',
  createdAt: 1,
}
const demoSession: Session = {
  userId: 'u_demo',
  email: 'demo@botanica.app',
  version: 1,
  remember: true,
  createdAt: NOW,
  expiresAt: NOW + 86_400_000,
  device: 'Test on jsdom',
}

const item = (uid: string, category: PlacedItem['category']): PlacedItem => ({
  uid,
  id: category === 'flora' ? 'fern' : category === 'fauna' ? 'shrimp' : 'stone',
  category,
  x: 0.5,
  y: 0.7,
  scale: 1,
  rotation: 0,
  flipX: false,
  zIndex: 1,
})

let auth: AuthService
let backend: GardenBackend
let studio: StudioStoreHook
let world: EngineWorld
let welcome: MemoryStorage
let toast: ReturnType<typeof vi.fn<(m: string) => void>>
let store: AccountStore

function makeStore(): AccountStore {
  return createAccountStore({
    auth,
    createBackend: () => backend,
    studio,
    getWorld: tryGetWorld,
    toast,
    welcomeStorage: welcome,
  })
}

/** Writes a garden straight to the backend, built from its own studio store and world. */
async function seedGarden(
  id: string,
  name: string,
  updatedAt: number,
  vessel: 'globe' | 'cylinder',
  items: PlacedItem[],
) {
  const s = createStudioStore(new MemoryStorage())
  s.setState({ vessel, dayCount: 5 })
  const w = createWorld()
  w.items = items
  await backend.saveGarden(id, {
    name,
    createdAt: 1,
    updatedAt,
    summary: gardenSummary(s.getState(), items),
    snapshot: getGardenSnapshot(s.getState(), w),
  })
}

/** Two gardens: A (globe, active in the profile) and B (cylinder, newer). Signs in as cloud. */
async function signInWithGardens() {
  await seedGarden('g_a', 'Alpha', NOW - 60_000, 'globe', [item('a1', 'flora')])
  await seedGarden('g_b', 'Other', NOW - 30_000, 'cylinder', [item('b1', 'fauna')])
  await backend.setProfile({ activeGardenId: 'g_a' })
  await store.getState().beginSession(demoUser, demoSession, { isNew: false })
}

beforeEach(() => {
  vi.useFakeTimers({ now: NOW })
  auth = { getSession: () => ({ session: null, user: null }) } as unknown as AuthService
  backend = createLocalBackend('u_demo', new MemoryStorage())
  studio = createStudioStore(new MemoryStorage())
  world = createWorld()
  registerWorld(world)
  welcome = new MemoryStorage()
  toast = vi.fn<(m: string) => void>()
  store = makeStore()
  useTelemetryStore.setState({ telemetry: createDefaultTelemetry() })
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  unregisterWorld()
  localStorage.clear()
})

describe('account store: session', () => {
  it('initAccount with no session opens sign-up once with the welcome banner, then never again', async () => {
    await store.getState().initAccount()
    expect(store.getState()).toMatchObject({ phase: 'signedout', panelOpen: true, view: 'signup' })
    expect(store.getState().viewData.banner).toEqual({ kind: 'info', text: WELCOME })
    expect(welcome.getItem('botanica_signin_prompt_seen_v1')).toBe('1')

    const again = makeStore()
    await again.getState().initAccount()
    expect(again.getState()).toMatchObject({ phase: 'signedout', panelOpen: false })
  })

  it('initAccount after an expiry or a revoke opens sign-in with the matching banner', async () => {
    auth.getSession = () => ({ session: null, user: null, ended: 'expired' })
    await store.getState().initAccount()
    expect(store.getState()).toMatchObject({ phase: 'signedout', panelOpen: true, view: 'signin' })
    expect(store.getState().viewData.banner).toEqual({ kind: 'info', text: EXPIRED })

    auth.getSession = () => ({ session: null, user: null, ended: 'revoked' })
    const other = makeStore()
    await other.getState().initAccount()
    expect(other.getState().viewData.banner?.text).toBe(REVOKED)
    expect(welcome.getItem('botanica_signin_prompt_seen_v1')).toBeNull()
  })

  it('initAccount with a live session begins it', async () => {
    await seedGarden('g_a', 'Alpha', NOW - 1000, 'globe', [])
    auth.getSession = () => ({ session: demoSession, user: demoUser })
    await store.getState().initAccount()
    expect(store.getState()).toMatchObject({ phase: 'cloud', activeId: 'g_a', user: demoUser })
  })

  it('demo sign-in with no gardens enters onboarding; createGarden("current") saves and enters cloud', async () => {
    await store.getState().beginSession(demoUser, demoSession, { isNew: false })
    expect(store.getState()).toMatchObject({
      phase: 'onboarding',
      panelOpen: true,
      view: 'onboarding',
    })
    world.items = [item('keep', 'flora')]
    const g = await store.getState().createGarden('current', '  Falls  ')
    expect(g.name).toBe('Falls')
    expect(store.getState()).toMatchObject({ phase: 'cloud', activeId: g.id, lastSaved: NOW })
    expect(await backend.listGardens()).toHaveLength(1)
    expect(await backend.getProfile()).toEqual({ activeGardenId: g.id })
    expect(store.getState().gardens.map((x) => x.id)).toEqual([g.id])
    expect(g.snapshot?.worldSnapshot?.items.map((i) => i.uid)).toEqual(['keep'])
    expect(g.summary).toMatchObject({ plants: 1, animals: 0 })
  })

  it('a new account always enters onboarding, even with gardens', async () => {
    await seedGarden('g_a', 'Alpha', NOW, 'globe', [])
    await store.getState().beginSession(demoUser, demoSession, { isNew: true })
    expect(store.getState()).toMatchObject({ phase: 'onboarding', view: 'onboarding' })
    expect(store.getState().gardens).toHaveLength(1)
  })

  it('beginSession with gardens opens the profile active garden and applies its snapshot', async () => {
    await seedGarden('g_a', 'Alpha', NOW - 60_000, 'globe', [item('a1', 'flora')])
    await seedGarden('g_b', 'Other', NOW - 30_000, 'cylinder', [item('b1', 'fauna')])
    await backend.setProfile({ activeGardenId: 'g_a' })
    await backend.addJournal('g_a', {
      at: NOW - 5000,
      day: 2,
      auto: true,
      note: '',
      metrics: { humidity: 1, temp: 2, moisture: 3, nutrients: 4, water: 5, air: 6 },
      summary: { vessel: 'globe', day: 2, plants: 1, animals: 0 },
      issues: [],
    })
    await store.getState().beginSession(demoUser, demoSession, { isNew: false })
    expect(store.getState()).toMatchObject({
      phase: 'cloud',
      activeId: 'g_a',
      lastSaved: NOW - 60_000,
      user: demoUser,
      session: demoSession,
    })
    expect(store.getState().gardens.map((g) => g.id)).toEqual(['g_b', 'g_a'])
    expect(store.getState().journal).toHaveLength(1)
    expect(studio.getState().vessel).toBe('globe')
    expect(world.items.map((i) => i.uid)).toEqual(['a1'])
  })

  it('beginSession falls back to the newest garden when the profile has none', async () => {
    await seedGarden('g_a', 'Alpha', NOW - 60_000, 'globe', [])
    await seedGarden('g_b', 'Other', NOW - 30_000, 'cylinder', [])
    await store.getState().beginSession(demoUser, demoSession, { isNew: false })
    expect(store.getState().activeId).toBe('g_b')
    expect(studio.getState().vessel).toBe('cylinder')
  })

  it('watchSession ends an expired session', async () => {
    await signInWithGardens()
    store.getState().scheduleCloudSave()
    auth.getSession = () => ({ session: null, user: null, ended: 'expired' })
    store.getState().watchSession()
    expect(store.getState()).toMatchObject({
      phase: 'signedout',
      panelOpen: true,
      view: 'signin',
      saveTimer: null,
    })
    expect(store.getState().viewData.banner?.text).toBe(EXPIRED)
  })

  it('watchSession ignores a live session and the signed-out phase', async () => {
    store.getState().watchSession()
    expect(store.getState().phase).toBe('checking')
    await signInWithGardens()
    auth.getSession = () => ({ session: demoSession, user: demoUser })
    store.getState().watchSession()
    expect(store.getState().phase).toBe('cloud')
  })

  it('endSession flushes the active garden, clears everything and toasts', async () => {
    await signInWithGardens()
    studio.getState().setVessel('teardrop')
    store.getState().scheduleCloudSave()
    await store.getState().endSession('Signed out')
    expect((await backend.listGardens()).find((g) => g.id === 'g_a')?.snapshot?.vessel).toBe(
      'teardrop',
    )
    expect(store.getState()).toMatchObject({
      phase: 'signedout',
      user: null,
      session: null,
      backend: null,
      gardens: [],
      activeId: null,
      journal: [],
      saveTimer: null,
      lastSaved: 0,
      lastError: '',
    })
    expect(toast).toHaveBeenCalledWith('Signed out')
  })
})

describe('account store: saving', () => {
  it('scheduleCloudSave debounces 2500 ms and writes summary + snapshot', async () => {
    await signInWithGardens()
    const save = vi.spyOn(backend, 'saveGarden')
    studio.getState().setVessel('teardrop')
    world.items = [item('p1', 'flora'), item('p2', 'flora'), item('f1', 'fauna')]

    store.getState().scheduleCloudSave()
    await vi.advanceTimersByTimeAsync(2000)
    store.getState().scheduleCloudSave()
    await vi.advanceTimersByTimeAsync(2000)
    expect(save).not.toHaveBeenCalled()
    expect(store.getState().saveTimer).not.toBeNull()
    await vi.advanceTimersByTimeAsync(500)
    expect(save).toHaveBeenCalledTimes(1)

    const saved = (await backend.listGardens()).find((g) => g.id === 'g_a')!
    expect(saved).toMatchObject({
      name: 'Alpha',
      createdAt: 1,
      updatedAt: NOW + 4500,
      summary: { vessel: 'teardrop', day: 5, plants: 2, animals: 1 },
    })
    expect(saved.snapshot?.vessel).toBe('teardrop')
    expect(saved.snapshot?.worldSnapshot?.items.map((i) => i.uid)).toEqual(['p1', 'p2', 'f1'])
    expect(store.getState()).toMatchObject({
      saveTimer: null,
      lastSaved: NOW + 4500,
      writing: false,
    })
    expect(store.getState().gardens.find((g) => g.id === 'g_a')?.updatedAt).toBe(NOW + 4500)
  })

  it('scheduleCloudSave does nothing outside the cloud phase', async () => {
    store.getState().scheduleCloudSave()
    expect(store.getState().saveTimer).toBeNull()
    await store.getState().beginSession(demoUser, demoSession, { isNew: false })
    store.getState().scheduleCloudSave()
    expect(store.getState().saveTimer).toBeNull()
  })

  it('serialises concurrent flushes: a second flush during a write saves again afterwards', async () => {
    await signInWithGardens()
    const real = backend.saveGarden.bind(backend)
    let release!: () => void
    const save = vi.spyOn(backend, 'saveGarden').mockImplementationOnce(async (id, body) => {
      await new Promise<void>((r) => (release = r))
      return real(id, body)
    })
    const first = store.getState().flushCloudSave()
    expect(store.getState().writing).toBe(true)
    await store.getState().flushCloudSave()
    expect(store.getState().pending).toBe(true)
    expect(save).toHaveBeenCalledTimes(1)
    release()
    await first
    expect(store.getState()).toMatchObject({ writing: false, pending: false })
    expect(store.getState().saveTimer).not.toBeNull()
    await vi.advanceTimersByTimeAsync(2500)
    expect(save).toHaveBeenCalledTimes(2)
  })

  it('flushes the active garden before opening another', async () => {
    await signInWithGardens()
    studio.getState().setVessel('teardrop')
    world.items = [item('dirty', 'flora')]
    const calls: string[] = []
    const real = backend.saveGarden.bind(backend)
    backend.saveGarden = async (id, body) => {
      calls.push(`${id}:${studio.getState().vessel}`)
      return real(id, body)
    }
    await store.getState().openGarden('g_b')
    expect(calls[0]).toBe('g_a:teardrop')
    const a = (await backend.listGardens()).find((g) => g.id === 'g_a')!
    expect(a.snapshot?.worldSnapshot?.items.map((i) => i.uid)).toEqual(['dirty'])
    expect(store.getState().activeId).toBe('g_b')
    expect(studio.getState().vessel).toBe('cylinder')
    expect(world.items.map((i) => i.uid)).toEqual(['b1'])
    expect(await backend.getProfile()).toEqual({ activeGardenId: 'g_b' })
    expect(toast).toHaveBeenCalledWith('Opened Other')
  })

  it('quota_exceeded sets lastError and toasts', async () => {
    await signInWithGardens()
    backend.saveGarden = async () => {
      throw new BackendError('quota_exceeded')
    }
    await store.getState().flushCloudSave()
    expect(store.getState().lastError).toBe('Storage is full')
    expect(toast).toHaveBeenCalledWith(
      'Your storage is full. Delete an old terrarium or journal entries.',
    )
    expect(store.getState().writing).toBe(false)
  })

  it('unavailable sets the retry message and retries after 4 to 7 s', async () => {
    await signInWithGardens()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const real = backend.saveGarden.bind(backend)
    const save = vi
      .spyOn(backend, 'saveGarden')
      .mockRejectedValueOnce(new BackendError('unavailable'))
      .mockImplementation(real)
    await store.getState().flushCloudSave()
    expect(store.getState().lastError).toBe('Not saved yet, retrying')
    expect(toast).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(3999)
    expect(store.getState().saveTimer).toBeNull()
    await vi.advanceTimersByTimeAsync(1)
    expect(store.getState().saveTimer).not.toBeNull()
    await vi.advanceTimersByTimeAsync(2500)
    expect(save).toHaveBeenCalledTimes(2)
    expect(store.getState().lastError).toBe('')
  })
  it('a flush that fails after sign-out leaves the signed-out state clean', async () => {
    await signInWithGardens()
    backend.saveGarden = async () => {
      throw new BackendError('quota_exceeded')
    }
    await store.getState().endSession()
    expect(store.getState()).toMatchObject({ phase: 'signedout', lastError: '' })
    expect(toast).not.toHaveBeenCalled()
  })

  it('signing out cancels a pending unavailable retry', async () => {
    await signInWithGardens()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const real = backend.saveGarden.bind(backend)
    const save = vi
      .spyOn(backend, 'saveGarden')
      .mockRejectedValueOnce(new BackendError('unavailable'))
      .mockImplementation(real)
    await store.getState().flushCloudSave()
    expect(store.getState().lastError).toBe('Not saved yet, retrying')
    await store.getState().endSession()
    expect(save).toHaveBeenCalledTimes(2) // the failed write and the sign-out flush

    // Back in the cloud phase before the retry would have fired: nothing is scheduled by it.
    await store.getState().beginSession(demoUser, demoSession, { isNew: false })
    await vi.advanceTimersByTimeAsync(7000)
    expect(store.getState().saveTimer).toBeNull()
    await vi.advanceTimersByTimeAsync(2500)
    expect(save).toHaveBeenCalledTimes(2)
  })
})

describe('account store: gardens and journal', () => {
  it('createGarden("empty") clears the scene and restarts the clock', async () => {
    await store.getState().beginSession(demoUser, demoSession, { isNew: false })
    studio.setState({ dayCount: 12, setupDay: 4, cycleProgress: 1, waterSplit: 0.32 })
    world.items = [item('x', 'flora')]
    world.moldPatches = [{ x: 0 }]
    world.surfaceGrains = [{ x: 0 }]
    const g = await store.getState().createGarden('empty', '')
    expect(g.name).toBe('My terrarium')
    expect(world).toMatchObject({ items: [], moldPatches: [], surfaceGrains: [] })
    expect(studio.getState()).toMatchObject({ dayCount: 1, setupDay: 1, cycleProgress: 0 })
    expect(world.env.cycleProgress).toBe(0)
    expect(g.summary).toMatchObject({ day: 1, plants: 0, animals: 0 })

    studio.setState({ waterSplit: 0 })
    await store.getState().createGarden('empty', 'x'.repeat(80))
    expect(studio.getState().cycleProgress).toBe(1)
    expect(store.getState().gardens).toHaveLength(2)
    expect(store.getState().gardens.every((x) => x.name.length <= 60)).toBe(true)
  })

  it('createGarden("falls") loads the Falls Lake preset on day 1', async () => {
    await store.getState().beginSession(demoUser, demoSession, { isNew: false })
    studio.setState({ dayCount: 9, vessel: 'globe' })
    const g = await store.getState().createGarden('falls', 'Falls Lake 1')
    expect(studio.getState()).toMatchObject({ dayCount: 1, setupDay: 1, vessel: 'paludarium_tank' })
    expect(world.items.length).toBeGreaterThan(0)
    expect(g.snapshot?.worldSnapshot?.items).toHaveLength(world.items.length)
  })

  it('createGarden from the cloud phase flushes the open garden first', async () => {
    await signInWithGardens()
    studio.getState().setVessel('teardrop')
    const g = await store.getState().createGarden('current', 'Third')
    const all = await backend.listGardens()
    expect(all.find((x) => x.id === 'g_a')?.snapshot?.vessel).toBe('teardrop')
    expect(store.getState().activeId).toBe(g.id)
    expect(store.getState().gardens).toHaveLength(3)
  })

  it('renameGarden trims, ignores blanks and updates the list; deleteGarden keeps the open one', async () => {
    await signInWithGardens()
    store.getState().setRenaming('g_b')
    await store.getState().renameGarden('g_b', '  Renamed  ')
    expect(store.getState().renaming).toBeNull()
    expect(store.getState().gardens.find((g) => g.id === 'g_b')?.name).toBe('Renamed')
    expect((await backend.listGardens()).find((g) => g.id === 'g_b')?.name).toBe('Renamed')
    await store.getState().renameGarden('g_b', '   ')
    expect(store.getState().gardens.find((g) => g.id === 'g_b')?.name).toBe('Renamed')

    await store.getState().deleteGarden('g_a')
    expect(store.getState().gardens).toHaveLength(2)
    store.getState().setConfirmDelete('g_b')
    await store.getState().deleteGarden('g_b')
    expect(store.getState().confirmDelete).toBeNull()
    expect(store.getState().gardens.map((g) => g.id)).toEqual(['g_a'])
    expect(toast).toHaveBeenCalledWith('Terrarium deleted')
  })

  it('addJournalEntry records metrics, trims to 600 chars and toasts unless auto', async () => {
    await signInWithGardens()
    studio.getState().setRoom({ water: 'tap', air: 'smoke' })
    useTelemetryStore.getState().setTelemetry({
      humidity: 81.6,
      temperature: 24.46,
      soilMoisture: 70.4,
      nutrients: 87.5,
      careIssues: [
        { level: 'info', text: 'i0' },
        { level: 'warn', text: 'w1' },
        { level: 'warn', text: 'w2' },
        { level: 'warn', text: 'w3' },
        { level: 'warn', text: 'w4' },
        { level: 'warn', text: 'w5' },
      ],
    })
    await store.getState().addJournalEntry(`  ${'n'.repeat(700)}  `, false)
    const [e] = store.getState().journal
    const m = envModel(studio.getState().room, studio.getState().hasLid)
    expect(m.water).toBeLessThan(100)
    expect(e).toMatchObject({
      at: NOW,
      day: 5,
      auto: false,
      metrics: {
        humidity: 82,
        temp: 24.5,
        moisture: 70,
        nutrients: 88,
        water: m.water,
        air: m.airEff,
      },
      summary: { vessel: 'globe', day: 5, plants: 1, animals: 0 },
      issues: ['w1', 'w2', 'w3', 'w4'],
    })
    expect(e?.note).toHaveLength(600)
    expect(toast).toHaveBeenCalledWith('Logged in your growth journal')

    toast.mockClear()
    await vi.advanceTimersByTimeAsync(10)
    await store.getState().addJournalEntry('', true)
    expect(store.getState().journal).toHaveLength(2)
    expect(toast).not.toHaveBeenCalled()
  })

  it('addJournalEntry does nothing outside the cloud phase', async () => {
    await store.getState().beginSession(demoUser, demoSession, { isNew: false })
    const add = vi.spyOn(backend, 'addJournal')
    await store.getState().addJournalEntry('hello', false)
    expect(add).not.toHaveBeenCalled()
  })
})

describe('account store: panel and run', () => {
  it('run() maps an AuthError with a field to fieldErrors and clears busy', async () => {
    store.setState({ phase: 'signedout' })
    store.getState().openAuth('signin', { email: 'a@b.co' })
    let busyDuring = false
    await store.getState().run(async () => {
      busyDuring = store.getState().busy
      throw new AuthError('wrong_password', 'That password is not right', { field: 'password' })
    })
    expect(busyDuring).toBe(true)
    expect(store.getState()).toMatchObject({ busy: false, view: 'signin' })
    expect(store.getState().viewData).toMatchObject({
      email: 'a@b.co',
      error: null,
      fieldErrors: { password: 'That password is not right' },
    })

    await store.getState().run(async () => {
      throw new AuthError('locked', 'Too many tries', { until: NOW + 60_000 })
    })
    expect(store.getState().viewData).toMatchObject({
      error: 'Too many tries',
      fieldErrors: {},
      lockedUntil: NOW + 60_000,
    })

    vi.spyOn(console, 'error').mockImplementation(() => {})
    await store.getState().run(async () => {
      throw new Error('boom')
    })
    expect(store.getState().viewData.error).toBe('Something went wrong. Try again.')
    expect(store.getState().busy).toBe(false)
  })

  it('run() maps an AuthError with code locked to viewData.lockedUntil', async () => {
    store.setState({ phase: 'signedout' })
    store.getState().openAuth('signin', { email: 'a@b.co' })
    await store.getState().run(async () => {
      throw new AuthError('locked', 'Too many tries. Try again in 5 minutes.', {
        field: 'password',
        until: NOW + 300_000,
      })
    })
    expect(store.getState().busy).toBe(false)
    expect(store.getState().viewData).toMatchObject({
      email: 'a@b.co',
      lockedUntil: NOW + 300_000,
      fieldErrors: { password: 'Too many tries. Try again in 5 minutes.' },
    })
  })

  it('run() ignores a call while busy', async () => {
    let release!: () => void
    const first = store.getState().run(() => new Promise<void>((r) => (release = r)))
    const second = vi.fn(async () => {})
    await store.getState().run(second)
    expect(second).not.toHaveBeenCalled()
    release()
    await first
    expect(store.getState().busy).toBe(false)
  })

  it('run() on not_verified switches to the verify view with the email and a 30 s resend window', async () => {
    store.getState().openAuth('signin', { email: 'demo@botanica.app' })
    await store.getState().run(async () => {
      throw new AuthError('not_verified', 'Confirm your email first', {
        email: 'Demo@Botanica.app',
      })
    })
    expect(store.getState()).toMatchObject({ view: 'verify', busy: false })
    expect(store.getState().viewData).toMatchObject({
      email: 'Demo@Botanica.app',
      resendAt: NOW + 30_000,
      notice: 'Confirm your email first',
      error: null,
      fieldErrors: {},
    })
  })

  it('closePanel is ignored during onboarding', async () => {
    await store.getState().beginSession(demoUser, demoSession, { isNew: true })
    store.getState().closePanel()
    expect(store.getState().panelOpen).toBe(true)
    await store.getState().createGarden('current', 'Mine')
    store.getState().closePanel()
    expect(store.getState().panelOpen).toBe(false)
  })

  it('closePanel clears an open rename and delete confirmation', () => {
    store.setState({ phase: 'cloud', panelOpen: true, renaming: 'g_a', confirmDelete: 'g_b' })
    store.getState().closePanel()
    expect(store.getState()).toMatchObject({
      panelOpen: false,
      renaming: null,
      confirmDelete: null,
    })
  })

  it('openPanel shows the checking view while checking and sign-in when signed out', () => {
    store.getState().openPanel()
    expect(store.getState()).toMatchObject({ panelOpen: true, view: 'checking' })
    store.setState({ phase: 'signedout', panelOpen: false, view: 'account' })
    store.getState().openPanel()
    expect(store.getState()).toMatchObject({ panelOpen: true, view: 'signin' })
  })

  it('goView merges view data and clears errors; openAuth replaces it', () => {
    store.getState().openAuth('signin', { email: 'a@b.co', error: 'x' })
    store.getState().goView('forgot', { remember: false })
    expect(store.getState().view).toBe('forgot')
    expect(store.getState().viewData).toEqual({
      email: 'a@b.co',
      remember: false,
      error: null,
      fieldErrors: {},
    })
    store.getState().setViewData({ code: '123' })
    expect(store.getState().viewData.code).toBe('123')
    store.getState().openAuth('signup')
    expect(store.getState().viewData).toEqual({})
    store.getState().setTab('journal')
    expect(store.getState().tab).toBe('journal')
  })
})

describe('account helpers', () => {
  it('chipStatus: checking → "One moment"/"", signedout → "Sign in"/"to save your work", saving → "Saving…", saved → "Saved just now", never saved → "Synced", error → the error text', () => {
    const base = store.getState()
    expect(chipStatus({ ...base, phase: 'checking' }, NOW)).toEqual({
      signedIn: false,
      name: 'One moment',
      text: '',
      q: 'idle',
    })
    expect(chipStatus({ ...base, phase: 'signedout' }, NOW)).toEqual({
      signedIn: false,
      name: 'Sign in',
      text: 'to save your work',
      q: 'idle',
    })
    const cloud = { ...base, phase: 'cloud' as const, user: demoUser }
    expect(chipStatus({ ...cloud, writing: true }, NOW)).toEqual({
      signedIn: true,
      name: 'Demo Gardener',
      text: 'Saving…',
      q: 'busy',
    })
    expect(chipStatus({ ...cloud, saveTimer: setTimeout(() => {}, 1) }, NOW).text).toBe('Saving…')
    expect(chipStatus({ ...cloud, lastSaved: NOW - 2000 }, NOW)).toMatchObject({
      text: 'Saved just now',
      q: 'ok',
    })
    expect(chipStatus({ ...cloud, lastSaved: 0 }, NOW)).toMatchObject({ text: 'Synced', q: 'ok' })
    expect(
      chipStatus({ ...cloud, lastError: 'Storage is full', writing: true }, NOW),
    ).toMatchObject({ text: 'Storage is full', q: 'err' })
    expect(chipStatus({ ...base, phase: 'onboarding', user: demoUser }, NOW).signedIn).toBe(true)
  })

  it('timeAgo: 0 → "not saved yet", 5 s → "just now", 45 s → "45 s ago", 3 min, 2 h, older → short date', () => {
    expect(timeAgo(0, NOW)).toBe('not saved yet')
    expect(timeAgo(NOW - 5000, NOW)).toBe('just now')
    expect(timeAgo(NOW - 45_000, NOW)).toBe('45 s ago')
    expect(timeAgo(NOW - 180_000, NOW)).toBe('3 min ago')
    expect(timeAgo(NOW - 2 * 3_600_000, NOW)).toBe('2 h ago')
    const old = NOW - 3 * 86_400_000
    expect(timeAgo(old, NOW)).toBe(
      new Date(old).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    )
    expect(timeAgo(NOW - 5000)).toBe('just now')
  })

  it('initialsOf("Demo Gardener") → "DG"; initialsOf("Linh") → "L"; avatarColor is stable', () => {
    expect(initialsOf('Demo Gardener')).toBe('DG')
    expect(initialsOf('Linh')).toBe('L')
    expect(initialsOf('  mai  thi  lan ')).toBe('ML')
    expect(initialsOf('')).toBe('?')
    expect(avatarColor('u_demo')).toBe(avatarColor('u_demo'))
    expect(avatarColor('u_demo')).toMatch(/^#[0-9a-f]{6}$/)
    // The prototype hash: h = (h * 31 + code) >>> 0 over the id, modulo the 8 colours.
    expect(avatarColor('a')).toBe('#40704f') // 97 % 8 = 1
  })
})
