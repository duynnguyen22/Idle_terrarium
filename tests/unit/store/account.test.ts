import { createStore, type Store } from 'jotai'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BackendError, createLocalBackend, type GardenBackend } from '@/auth/backend'
import { AuthError, type AuthService, type PublicUser, type Session } from '@/auth'
import type { PlacedItem } from '@/data/types'
import { onWorldRestored, registerWorld, tryGetWorld, unregisterWorld } from '@/engine/engineBridge'
import { poolScore } from '@/engine/simulation/ecology'
import { envModel } from '@/engine/room'
import { createWorld, type EngineWorld } from '@/engine/world'
import { getGardenSnapshot, gardenSummary } from '@/store/gardenSnapshot'
import {
  accountStateAtom,
  avatarColor,
  chipStatus,
  createAccount,
  initialsOf,
  patchAccountAtom,
  timeAgo,
  type Account,
} from '@/store/account'
import {
  bindStudioStorage,
  patchStudioAtom,
  roomAtom,
  studioStateAtom,
  vesselAtom,
  type StudioState,
} from '@/store/studio'
import { telemetryAtom } from '@/store/telemetry'

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
let world: EngineWorld
let welcome: MemoryStorage
let toast: ReturnType<typeof vi.fn<(m: string) => void>>
/** The jotai store holding both the account atoms and the studio atoms the account saves. */
let store: Store
let account: Account

/** A fresh jotai store with its studio atoms bound to an in-memory save (old createStudioStore). */
function makeStore(): Store {
  const s = createStore()
  bindStudioStorage(s, new MemoryStorage())
  return s
}

function makeAccount(s: Store): Account {
  return createAccount(s, {
    auth,
    createBackend: () => backend,
    getWorld: tryGetWorld,
    toast,
    welcomeStorage: welcome,
  })
}

const state = () => store.get(accountStateAtom)

/** Builds a studio state in its own store (not the account's) from a raw patch. */
function studioState(patch: Partial<StudioState>): StudioState {
  const s = makeStore()
  s.set(patchStudioAtom, patch)
  return s.get(studioStateAtom)
}

/** Writes a garden straight to the backend, built from its own studio store and world. */
async function seedGarden(
  id: string,
  name: string,
  updatedAt: number,
  vessel: 'globe' | 'cylinder',
  items: PlacedItem[],
) {
  const s = studioState({ vessel, dayCount: 5 })
  const w = createWorld()
  w.items = items
  await backend.saveGarden(id, {
    name,
    createdAt: 1,
    updatedAt,
    summary: gardenSummary(s, items),
    snapshot: getGardenSnapshot(s, w),
  })
}

/** Two gardens: A (globe, active in the profile) and B (cylinder, newer). Signs in as cloud. */
async function signInWithGardens() {
  await seedGarden('g_a', 'Alpha', NOW - 60_000, 'globe', [item('a1', 'flora')])
  await seedGarden('g_b', 'Other', NOW - 30_000, 'cylinder', [item('b1', 'fauna')])
  await backend.setProfile({ activeGardenId: 'g_a' })
  await account.beginSession(demoUser, demoSession, { isNew: false })
}

beforeEach(() => {
  vi.useFakeTimers({ now: NOW })
  auth = { getSession: () => ({ session: null, user: null }) } as unknown as AuthService
  backend = createLocalBackend('u_demo', new MemoryStorage())
  world = createWorld()
  registerWorld(world)
  welcome = new MemoryStorage()
  toast = vi.fn<(m: string) => void>()
  // A fresh store per test: default account, studio and telemetry atoms.
  store = makeStore()
  account = makeAccount(store)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  unregisterWorld()
  localStorage.clear()
})

describe('account store: session', () => {
  it('initAccount with no session opens sign-up once with the welcome banner, then never again', async () => {
    await account.initAccount()
    expect(state()).toMatchObject({ phase: 'signedout', panelOpen: true, view: 'signup' })
    expect(state().viewData.banner).toEqual({ kind: 'info', text: WELCOME })
    expect(welcome.getItem('botanica_signin_prompt_seen_v1')).toBe('1')

    const againStore = makeStore()
    await makeAccount(againStore).initAccount()
    expect(againStore.get(accountStateAtom)).toMatchObject({
      phase: 'signedout',
      panelOpen: false,
    })
  })

  it('initAccount after an expiry or a revoke opens sign-in with the matching banner', async () => {
    auth.getSession = () => ({ session: null, user: null, ended: 'expired' })
    await account.initAccount()
    expect(state()).toMatchObject({ phase: 'signedout', panelOpen: true, view: 'signin' })
    expect(state().viewData.banner).toEqual({ kind: 'info', text: EXPIRED })

    auth.getSession = () => ({ session: null, user: null, ended: 'revoked' })
    const otherStore = makeStore()
    await makeAccount(otherStore).initAccount()
    expect(otherStore.get(accountStateAtom).viewData.banner?.text).toBe(REVOKED)
    expect(welcome.getItem('botanica_signin_prompt_seen_v1')).toBeNull()
  })

  it('initAccount with a live session begins it', async () => {
    await seedGarden('g_a', 'Alpha', NOW - 1000, 'globe', [])
    auth.getSession = () => ({ session: demoSession, user: demoUser })
    await account.initAccount()
    expect(state()).toMatchObject({ phase: 'cloud', activeId: 'g_a', user: demoUser })
  })

  it('demo sign-in with no gardens enters onboarding; createGarden("current") saves and enters cloud', async () => {
    await account.beginSession(demoUser, demoSession, { isNew: false })
    expect(state()).toMatchObject({
      phase: 'onboarding',
      panelOpen: true,
      view: 'onboarding',
    })
    world.items = [item('keep', 'flora')]
    const g = await account.createGarden('current', '  Falls  ')
    expect(g.name).toBe('Falls')
    expect(state()).toMatchObject({ phase: 'cloud', activeId: g.id, lastSaved: NOW })
    expect(await backend.listGardens()).toHaveLength(1)
    expect(await backend.getProfile()).toEqual({ activeGardenId: g.id })
    expect(state().gardens.map((x) => x.id)).toEqual([g.id])
    expect(g.snapshot?.worldSnapshot?.items.map((i) => i.uid)).toEqual(['keep'])
    expect(g.summary).toMatchObject({ plants: 1, animals: 0 })
  })

  it('a new account always enters onboarding, even with gardens', async () => {
    await seedGarden('g_a', 'Alpha', NOW, 'globe', [])
    await account.beginSession(demoUser, demoSession, { isNew: true })
    expect(state()).toMatchObject({ phase: 'onboarding', view: 'onboarding' })
    expect(state().gardens).toHaveLength(1)
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
    await account.beginSession(demoUser, demoSession, { isNew: false })
    expect(state()).toMatchObject({
      phase: 'cloud',
      activeId: 'g_a',
      lastSaved: NOW - 60_000,
      user: demoUser,
      session: demoSession,
    })
    expect(state().gardens.map((g) => g.id)).toEqual(['g_b', 'g_a'])
    expect(state().journal).toHaveLength(1)
    expect(store.get(vesselAtom)).toBe('globe')
    expect(world.items.map((i) => i.uid)).toEqual(['a1'])
  })

  it('beginSession is already in the cloud phase when the restored-world catch-up runs', async () => {
    const s = studioState({ vessel: 'globe', dayCount: 5, lastSimulatedAt: NOW - 6 * 3_600_000 })
    await backend.saveGarden('g_a', {
      name: 'Alpha',
      createdAt: 1,
      updatedAt: NOW - 60_000,
      summary: gardenSummary(s, []),
      snapshot: getGardenSnapshot(s, createWorld()),
    })
    store.set(patchAccountAtom, { phase: 'signedout' })
    const phases: string[] = []
    const off = onWorldRestored(() => phases.push(state().phase))
    await account.beginSession(demoUser, demoSession, { isNew: false })
    off()
    expect(phases).toEqual(['cloud'])
  })

  it('beginSession falls back to the newest garden when the profile has none', async () => {
    await seedGarden('g_a', 'Alpha', NOW - 60_000, 'globe', [])
    await seedGarden('g_b', 'Other', NOW - 30_000, 'cylinder', [])
    await account.beginSession(demoUser, demoSession, { isNew: false })
    expect(state().activeId).toBe('g_b')
    expect(store.get(vesselAtom)).toBe('cylinder')
  })

  it('watchSession ends an expired session', async () => {
    await signInWithGardens()
    account.scheduleCloudSave()
    auth.getSession = () => ({ session: null, user: null, ended: 'expired' })
    account.watchSession()
    expect(state()).toMatchObject({
      phase: 'signedout',
      panelOpen: true,
      view: 'signin',
      saveTimer: null,
    })
    expect(state().viewData.banner?.text).toBe(EXPIRED)
  })

  it('watchSession ignores a live session and the signed-out phase', async () => {
    account.watchSession()
    expect(state().phase).toBe('checking')
    await signInWithGardens()
    auth.getSession = () => ({ session: demoSession, user: demoUser })
    account.watchSession()
    expect(state().phase).toBe('cloud')
  })

  it('endSession flushes the active garden, clears everything and toasts', async () => {
    await signInWithGardens()
    store.set(vesselAtom, 'teardrop')
    account.scheduleCloudSave()
    await account.endSession('Signed out')
    expect((await backend.listGardens()).find((g) => g.id === 'g_a')?.snapshot?.vessel).toBe(
      'teardrop',
    )
    expect(state()).toMatchObject({
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
    store.set(vesselAtom, 'teardrop')
    world.items = [item('p1', 'flora'), item('p2', 'flora'), item('f1', 'fauna')]

    account.scheduleCloudSave()
    await vi.advanceTimersByTimeAsync(2000)
    account.scheduleCloudSave()
    await vi.advanceTimersByTimeAsync(2000)
    expect(save).not.toHaveBeenCalled()
    expect(state().saveTimer).not.toBeNull()
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
    expect(state()).toMatchObject({
      saveTimer: null,
      lastSaved: NOW + 4500,
      writing: false,
    })
    expect(state().gardens.find((g) => g.id === 'g_a')?.updatedAt).toBe(NOW + 4500)
  })

  it('scheduleCloudSave does nothing outside the cloud phase', async () => {
    account.scheduleCloudSave()
    expect(state().saveTimer).toBeNull()
    await account.beginSession(demoUser, demoSession, { isNew: false })
    account.scheduleCloudSave()
    expect(state().saveTimer).toBeNull()
  })

  it('detachActiveGarden cancels the pending save, waits for a write under way and returns the open id', async () => {
    await signInWithGardens()
    let release!: () => void
    const save = vi
      .spyOn(backend, 'saveGarden')
      .mockImplementationOnce(() => new Promise<void>((r) => (release = r)))
    const flushing = account.flushCloudSave()
    expect(state().writing).toBe(true)
    // A save requested during the write would normally run once it lands.
    void account.flushCloudSave()
    expect(state().pending).toBe(true)

    let detached: string | null | undefined
    const detaching = account.detachActiveGarden().then((id) => (detached = id))
    expect(state().activeId).toBeNull()
    await vi.advanceTimersByTimeAsync(0)
    expect(detached).toBeUndefined()
    release()
    await flushing
    await detaching
    expect(detached).toBe('g_a')
    expect(state()).toMatchObject({ writing: false, pending: false, saveTimer: null })

    account.scheduleCloudSave()
    await vi.advanceTimersByTimeAsync(10_000)
    expect(save).toHaveBeenCalledTimes(1)
  })

  it('attachActiveGarden reopens a terrarium only while signed in', async () => {
    await signInWithGardens()
    await account.detachActiveGarden()
    account.attachActiveGarden('g_a')
    expect(state().activeId).toBe('g_a')
    await account.endSession()
    account.attachActiveGarden('g_a')
    expect(state().activeId).toBeNull()
  })

  it('serialises concurrent flushes: a second flush during a write saves again afterwards', async () => {
    await signInWithGardens()
    const real = backend.saveGarden.bind(backend)
    let release!: () => void
    const save = vi.spyOn(backend, 'saveGarden').mockImplementationOnce(async (id, body) => {
      await new Promise<void>((r) => (release = r))
      return real(id, body)
    })
    const first = account.flushCloudSave()
    expect(state().writing).toBe(true)
    await account.flushCloudSave()
    expect(state().pending).toBe(true)
    expect(save).toHaveBeenCalledTimes(1)
    release()
    await first
    expect(state()).toMatchObject({ writing: false, pending: false })
    expect(state().saveTimer).not.toBeNull()
    await vi.advanceTimersByTimeAsync(2500)
    expect(save).toHaveBeenCalledTimes(2)
  })

  it('flushes the active garden before opening another', async () => {
    await signInWithGardens()
    store.set(vesselAtom, 'teardrop')
    world.items = [item('dirty', 'flora')]
    const calls: string[] = []
    const real = backend.saveGarden.bind(backend)
    backend.saveGarden = async (id, body) => {
      calls.push(`${id}:${store.get(vesselAtom)}`)
      return real(id, body)
    }
    await account.openGarden('g_b')
    expect(calls[0]).toBe('g_a:teardrop')
    const a = (await backend.listGardens()).find((g) => g.id === 'g_a')!
    expect(a.snapshot?.worldSnapshot?.items.map((i) => i.uid)).toEqual(['dirty'])
    expect(state().activeId).toBe('g_b')
    expect(store.get(vesselAtom)).toBe('cylinder')
    expect(world.items.map((i) => i.uid)).toEqual(['b1'])
    expect(await backend.getProfile()).toEqual({ activeGardenId: 'g_b' })
    expect(toast).toHaveBeenCalledWith('Opened Other')
  })

  it('quota_exceeded sets lastError and toasts', async () => {
    await signInWithGardens()
    backend.saveGarden = async () => {
      throw new BackendError('quota_exceeded')
    }
    await account.flushCloudSave()
    expect(state().lastError).toBe('Storage is full')
    expect(toast).toHaveBeenCalledWith(
      'Your storage is full. Delete an old terrarium or journal entries.',
    )
    expect(state().writing).toBe(false)
  })

  it('consecutive quota failures toast once; a new failure after a save toasts again', async () => {
    await signInWithGardens()
    const real = backend.saveGarden.bind(backend)
    const save = vi
      .spyOn(backend, 'saveGarden')
      .mockRejectedValueOnce(new BackendError('quota_exceeded'))
      .mockRejectedValueOnce(new BackendError('quota_exceeded'))
      .mockImplementationOnce(real)
      .mockRejectedValueOnce(new BackendError('quota_exceeded'))
    await account.flushCloudSave()
    await account.flushCloudSave()
    expect(state().lastError).toBe('Storage is full')
    expect(toast).toHaveBeenCalledTimes(1)
    await account.flushCloudSave()
    expect(state().lastError).toBe('')
    await account.flushCloudSave()
    expect(save).toHaveBeenCalledTimes(4)
    expect(toast).toHaveBeenCalledTimes(2)
  })

  it('unavailable sets the retry message and retries after 4 to 7 s', async () => {
    await signInWithGardens()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const real = backend.saveGarden.bind(backend)
    const save = vi
      .spyOn(backend, 'saveGarden')
      .mockRejectedValueOnce(new BackendError('unavailable'))
      .mockImplementation(real)
    await account.flushCloudSave()
    expect(state().lastError).toBe('Not saved yet, retrying')
    expect(toast).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(3999)
    expect(state().saveTimer).toBeNull()
    await vi.advanceTimersByTimeAsync(1)
    expect(state().saveTimer).not.toBeNull()
    await vi.advanceTimersByTimeAsync(2500)
    expect(save).toHaveBeenCalledTimes(2)
    expect(state().lastError).toBe('')
  })
  it('a flush that fails after sign-out leaves the signed-out state clean', async () => {
    await signInWithGardens()
    backend.saveGarden = async () => {
      throw new BackendError('quota_exceeded')
    }
    await account.endSession()
    expect(state()).toMatchObject({ phase: 'signedout', lastError: '' })
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
    await account.flushCloudSave()
    expect(state().lastError).toBe('Not saved yet, retrying')
    await account.endSession()
    expect(save).toHaveBeenCalledTimes(2) // the failed write and the sign-out flush

    // Back in the cloud phase before the retry would have fired: nothing is scheduled by it.
    await account.beginSession(demoUser, demoSession, { isNew: false })
    await vi.advanceTimersByTimeAsync(7000)
    expect(state().saveTimer).toBeNull()
    await vi.advanceTimersByTimeAsync(2500)
    expect(save).toHaveBeenCalledTimes(2)
  })
})

describe('account store: gardens and journal', () => {
  it('createGarden("empty") clears the scene and restarts the clock', async () => {
    await account.beginSession(demoUser, demoSession, { isNew: false })
    store.set(patchStudioAtom, { dayCount: 12, setupDay: 4, cycleProgress: 1, waterSplit: 0.32 })
    world.items = [item('x', 'flora')]
    world.moldPatches = [{ x: 0 }]
    world.surfaceGrains = [{ x: 0 }]
    world.ecoTime = 11.4
    world.breed = { springtails: 0.5 }
    world.mossTufts = [{ x: 0.4, r: 3, w: 1, seed: 1 }]
    const g = await account.createGarden('empty', '')
    expect(world.ecoTime).toBe(0)
    expect(world.breed).toEqual({})
    expect(world.mossTufts).toHaveLength(0)
    expect(g.snapshot?.worldSnapshot?.mossTufts ?? []).toHaveLength(0)
    expect(g.name).toBe('My terrarium')
    expect(world).toMatchObject({ items: [], moldPatches: [], surfaceGrains: [] })
    expect(store.get(studioStateAtom)).toMatchObject({ dayCount: 1, setupDay: 1, cycleProgress: 0 })
    expect(world.env.cycleProgress).toBe(0)
    expect(g.summary).toMatchObject({ day: 1, plants: 0, animals: 0 })

    store.set(patchStudioAtom, { waterSplit: 0 })
    await account.createGarden('empty', 'x'.repeat(80))
    expect(store.get(studioStateAtom).cycleProgress).toBe(1)
    expect(state().gardens).toHaveLength(2)
    expect(state().gardens.every((x) => x.name.length <= 60)).toBe(true)
  })

  it('createGarden("falls") loads the Falls Lake preset on day 1', async () => {
    await account.beginSession(demoUser, demoSession, { isNew: false })
    store.set(patchStudioAtom, { dayCount: 9, vessel: 'globe' })
    world.ecoTime = 8.2
    world.breed = { isopod: 0.3 }
    world.mossTufts = [{ x: 0.4, r: 3, w: 1, seed: 1 }]
    const g = await account.createGarden('falls', 'Falls Lake 1')
    expect(world.ecoTime).toBe(0)
    expect(world.breed).toEqual({})
    expect(world.mossTufts).toHaveLength(0)
    expect(store.get(studioStateAtom)).toMatchObject({
      dayCount: 1,
      setupDay: 1,
      vessel: 'paludarium_tank',
    })
    expect(world.items.length).toBeGreaterThan(0)
    expect(g.snapshot?.worldSnapshot?.items).toHaveLength(world.items.length)
  })

  it('createGarden from the cloud phase flushes the open garden first', async () => {
    await signInWithGardens()
    store.set(vesselAtom, 'teardrop')
    const g = await account.createGarden('current', 'Third')
    const all = await backend.listGardens()
    expect(all.find((x) => x.id === 'g_a')?.snapshot?.vessel).toBe('teardrop')
    expect(state().activeId).toBe(g.id)
    expect(state().gardens).toHaveLength(3)
  })

  it('a failed createGarden restores the open garden and scene, so the next save cannot overwrite it', async () => {
    await signInWithGardens()
    // Writes to the existing gardens succeed; the new record does not fit.
    const real = backend.saveGarden.bind(backend)
    vi.spyOn(backend, 'saveGarden').mockImplementation((id, body) =>
      id === 'g_a' || id === 'g_b'
        ? real(id, body)
        : Promise.reject(new BackendError('quota_exceeded')),
    )
    await account.run(async () => {
      await account.createGarden('empty', 'New')
    })
    expect(state().viewData.error).toBe(
      'Your storage is full. Delete an old terrarium or journal entries.',
    )
    expect(state().activeId).toBe('g_a')
    expect(store.get(vesselAtom)).toBe('globe')
    expect(world.items.map((i) => i.uid)).toEqual(['a1'])

    // The save the scene change would have scheduled writes the old garden back unchanged.
    account.scheduleCloudSave()
    await vi.advanceTimersByTimeAsync(2500)
    const all = await backend.listGardens()
    expect(all.map((g) => g.id).sort()).toEqual(['g_a', 'g_b'])
    const a = all.find((g) => g.id === 'g_a')!
    expect(a.snapshot?.vessel).toBe('globe')
    expect(a.snapshot?.worldSnapshot?.items.map((i) => i.uid)).toEqual(['a1'])
    expect(await backend.getProfile()).toEqual({ activeGardenId: 'g_a' })
  })

  it('a createGarden whose profile write fails removes the half-made garden', async () => {
    await signInWithGardens()
    vi.spyOn(backend, 'setProfile').mockRejectedValueOnce(new BackendError('unavailable'))
    await expect(account.createGarden('falls', 'Falls')).rejects.toThrow()
    expect((await backend.listGardens()).map((g) => g.id).sort()).toEqual(['g_a', 'g_b'])
    expect(state().activeId).toBe('g_a')
    expect(store.get(vesselAtom)).toBe('globe')
  })

  it('renameGarden trims, ignores blanks and updates the list; deleteGarden keeps the open one', async () => {
    await signInWithGardens()
    account.setRenaming('g_b')
    await account.renameGarden('g_b', '  Renamed  ')
    expect(state().renaming).toBeNull()
    expect(state().gardens.find((g) => g.id === 'g_b')?.name).toBe('Renamed')
    expect((await backend.listGardens()).find((g) => g.id === 'g_b')?.name).toBe('Renamed')
    await account.renameGarden('g_b', '   ')
    expect(state().gardens.find((g) => g.id === 'g_b')?.name).toBe('Renamed')

    await account.deleteGarden('g_a')
    expect(state().gardens).toHaveLength(2)
    account.setConfirmDelete('g_b')
    await account.deleteGarden('g_b')
    expect(state().confirmDelete).toBeNull()
    expect(state().gardens.map((g) => g.id)).toEqual(['g_a'])
    expect(toast).toHaveBeenCalledWith('Terrarium deleted')
  })

  it('addJournalEntry records metrics, trims to 600 chars and toasts unless auto', async () => {
    await signInWithGardens()
    store.set(roomAtom, { water: 'tap', air: 'smoke' })
    store.set(telemetryAtom, {
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
    await account.addJournalEntry(`  ${'n'.repeat(700)}  `, false)
    const [e] = state().journal
    const m = envModel(store.get(studioStateAtom).room, store.get(studioStateAtom).hasLid)
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
    await account.addJournalEntry('', true)
    expect(state().journal).toHaveLength(2)
    expect(toast).not.toHaveBeenCalled()
  })

  it('addJournalEntry stores events, key and pool', async () => {
    await signInWithGardens()
    store.set(patchStudioAtom, { cycleProgress: 0.5 })
    const events = [{ kind: 'frond' as const, text: 'A fern unfurled a frond.' }]
    await account.addJournalEntry('Note', true, { events, key: 'day:1:2' })
    const [e] = state().journal
    expect(e).toMatchObject({
      key: 'day:1:2',
      events,
      metrics: { pool: Math.round(poolScore(0.5)) },
    })
    expect(Number.isInteger(e?.metrics.pool)).toBe(true)

    await vi.advanceTimersByTimeAsync(10)
    await account.addJournalEntry('', false)
    const [plain] = state().journal
    expect(plain?.key).toBeUndefined()
    expect(plain?.events).toBeUndefined()
    expect(typeof plain?.metrics.pool).toBe('number')
  })

  it('addJournalEntry leaves pool out for a tank without a pool', async () => {
    await signInWithGardens()
    store.set(patchStudioAtom, { waterSplit: 0, cycleProgress: 1 })
    await account.addJournalEntry('Dry tank', false)
    const [e] = state().journal
    expect(e?.note).toBe('Dry tank')
    expect(e?.metrics).not.toHaveProperty('pool')
  })

  it('skips an auto entry whose key matches the newest entry', async () => {
    await signInWithGardens()
    const add = vi.spyOn(backend, 'addJournal')
    expect(await account.addJournalEntry('a', true, { key: 'k1' })).toBe(true)
    await vi.advanceTimersByTimeAsync(10)
    expect(await account.addJournalEntry('a', true, { key: 'k1' })).toBe(false)
    expect(add).toHaveBeenCalledTimes(1)
    expect(await account.addJournalEntry('b', true, { key: 'k2' })).toBe(true)
    expect(add).toHaveBeenCalledTimes(2)
  })

  it('addJournalEntry does nothing outside the cloud phase', async () => {
    await account.beginSession(demoUser, demoSession, { isNew: false })
    const add = vi.spyOn(backend, 'addJournal')
    await account.addJournalEntry('hello', false)
    expect(add).not.toHaveBeenCalled()
  })
})

describe('account store: panel and run', () => {
  it('run() maps an AuthError with a field to fieldErrors and clears busy', async () => {
    store.set(patchAccountAtom, { phase: 'signedout' })
    account.openAuth('signin', { email: 'a@b.co' })
    let busyDuring = false
    await account.run(async () => {
      busyDuring = state().busy
      throw new AuthError('wrong_password', 'That password is not right', { field: 'password' })
    })
    expect(busyDuring).toBe(true)
    expect(state()).toMatchObject({ busy: false, view: 'signin' })
    expect(state().viewData).toMatchObject({
      email: 'a@b.co',
      error: null,
      fieldErrors: { password: 'That password is not right' },
    })

    await account.run(async () => {
      throw new AuthError('locked', 'Too many tries', { until: NOW + 60_000 })
    })
    expect(state().viewData).toMatchObject({
      error: 'Too many tries',
      fieldErrors: {},
      lockedUntil: NOW + 60_000,
    })

    vi.spyOn(console, 'error').mockImplementation(() => {})
    await account.run(async () => {
      throw new Error('boom')
    })
    expect(state().viewData.error).toBe('Something went wrong. Try again.')
    expect(state().busy).toBe(false)
  })

  it('run() maps an AuthError with code locked to viewData.lockedUntil', async () => {
    store.set(patchAccountAtom, { phase: 'signedout' })
    account.openAuth('signin', { email: 'a@b.co' })
    await account.run(async () => {
      throw new AuthError('locked', 'Too many tries. Try again in 5 minutes.', {
        field: 'password',
        until: NOW + 300_000,
      })
    })
    expect(state().busy).toBe(false)
    expect(state().viewData).toMatchObject({
      email: 'a@b.co',
      lockedUntil: NOW + 300_000,
      fieldErrors: { password: 'Too many tries. Try again in 5 minutes.' },
    })
  })

  it('run() ignores a call while busy', async () => {
    let release!: () => void
    const first = account.run(() => new Promise<void>((r) => (release = r)))
    const second = vi.fn(async () => {})
    await account.run(second)
    expect(second).not.toHaveBeenCalled()
    release()
    await first
    expect(state().busy).toBe(false)
  })

  it('run() on not_verified switches to the verify view with the email and a 30 s resend window', async () => {
    account.openAuth('signin', { email: 'demo@botanica.app' })
    await account.run(async () => {
      throw new AuthError('not_verified', 'Confirm your email first', {
        email: 'Demo@Botanica.app',
      })
    })
    expect(state()).toMatchObject({ view: 'verify', busy: false })
    expect(state().viewData).toMatchObject({
      email: 'Demo@Botanica.app',
      resendAt: NOW + 30_000,
      notice: 'Confirm your email first',
      error: null,
      fieldErrors: {},
    })
  })

  it('closePanel is ignored during onboarding', async () => {
    await account.beginSession(demoUser, demoSession, { isNew: true })
    account.closePanel()
    expect(state().panelOpen).toBe(true)
    await account.createGarden('current', 'Mine')
    account.closePanel()
    expect(state().panelOpen).toBe(false)
  })

  it('closePanel clears an open rename and delete confirmation', () => {
    store.set(patchAccountAtom, {
      phase: 'cloud',
      panelOpen: true,
      renaming: 'g_a',
      confirmDelete: 'g_b',
    })
    account.closePanel()
    expect(state()).toMatchObject({
      panelOpen: false,
      renaming: null,
      confirmDelete: null,
    })
  })

  it('openPanel shows the checking view while checking and sign-in when signed out', () => {
    account.openPanel()
    expect(state()).toMatchObject({ panelOpen: true, view: 'checking' })
    store.set(patchAccountAtom, { phase: 'signedout', panelOpen: false, view: 'account' })
    account.openPanel()
    expect(state()).toMatchObject({ panelOpen: true, view: 'signin' })
  })

  it('goView merges view data and clears errors; openAuth replaces it', () => {
    account.openAuth('signin', { email: 'a@b.co', error: 'x' })
    account.goView('forgot', { remember: false })
    expect(state().view).toBe('forgot')
    expect(state().viewData).toEqual({
      email: 'a@b.co',
      remember: false,
      error: null,
      fieldErrors: {},
    })
    account.setViewData({ code: '123' })
    expect(state().viewData.code).toBe('123')
    account.openAuth('signup')
    expect(state().viewData).toEqual({})
    account.setTab('journal')
    expect(state().tab).toBe('journal')
  })

  it('setUser replaces the signed-in user', () => {
    store.set(patchAccountAtom, { user: { ...demoUser, name: 'Old' } })
    expect(account.setUser({ ...demoUser, name: 'New Name' })).toBe(true)
    expect(state().user?.name).toBe('New Name')
  })

  it('setUser ignores a user when nobody or someone else is signed in', () => {
    expect(account.setUser({ ...demoUser, name: 'Late' })).toBe(false)
    expect(state().user).toBeNull()
    store.set(patchAccountAtom, { user: { ...demoUser, id: 'u_other', name: 'Other' } })
    expect(account.setUser({ ...demoUser, name: 'Late' })).toBe(false)
    expect(state().user).toMatchObject({ id: 'u_other', name: 'Other' })
  })
})

describe('account helpers', () => {
  it('chipStatus: checking → "One moment"/"", signedout → "Sign in"/"to save your work", saving → "Saving…", saved → "Saved just now", never saved → "Synced", error → the error text', () => {
    const base = state()
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
