import { act, render } from '@testing-library/react'
import { createStore } from 'jotai'
import { useRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PublicUser, Session } from '@/auth'
import { createLocalBackend } from '@/auth/backend'
import type { PlacedItem } from '@/data/types'
import { mutateWorld, getWorld, unregisterWorld } from '@/engine/engineBridge'
import { hasPool } from '@/engine/geometry'
import { configureSpriteCache } from '@/engine/sprites/spriteCache'
import * as catchup from '@/engine/simulation/catchup'
import { createWorld } from '@/engine/world'
import { useTerrariumEngine } from '@/hooks/useTerrariumEngine'
import { applyGardenSnapshot, getGardenSnapshot } from '@/store/gardenSnapshot'
import { account, journalAtom, patchAccountAtom, resetAccountAtom } from '@/store/account'
import { appStore } from '@/store/appStore'
import { awayIndexAtom, openAwayAtom, resetOverlayAtom } from '@/store/overlay'
import {
  awayLogAtom,
  bindStudioStorage,
  createDefaultState,
  dayCountAtom,
  envSeedAtom,
  lastSimulatedAtAtom,
  patchStudioAtom,
  studioStateAtom,
  waterSplitAtom,
  worldSnapshotAtom,
} from '@/store/studio'
import { telemetryAtom } from '@/store/telemetry'
import { makeRecordingContext } from '../helpers/recordingContext'

vi.mock('@/engine/simulation/catchup', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/engine/simulation/catchup')>()
  return { ...actual, runCatchUpIfDue: vi.fn(actual.runCatchUpIfDue) }
})

class MemoryStorage implements Storage {
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

const fern = (uid: string): PlacedItem => ({
  uid,
  id: 'fern',
  category: 'flora',
  x: 0.5,
  y: 0.7,
  scale: 1,
  rotation: 0,
  flipX: false,
  zIndex: 1,
  stage: 'mature',
  growthProgress: 1,
  vitality: 100,
  parentUid: null,
  offsetX: 0,
  offsetY: 0,
})

/** A saved garden whose clock stopped `hoursAgo` hours ago, holding one fern. */
function staleGarden(hoursAgo: number, uid: string) {
  const s = createStore()
  bindStudioStorage(s, new MemoryStorage())
  s.set(patchStudioAtom, { lastSimulatedAt: Date.now() - hoursAgo * 3_600_000, awayLog: [] })
  const w = createWorld()
  w.items = [fern(uid)]
  return getGardenSnapshot(s.get(studioStateAtom), w)
}

function Harness() {
  const ref = useRef<HTMLCanvasElement>(null)
  useTerrariumEngine(ref)
  return <canvas ref={ref} width={800} height={600} />
}

/** A canvas nobody has sized yet: the browser's default 300 x 150 backing store. */
function UnsizedHarness() {
  const ref = useRef<HTMLCanvasElement>(null)
  useTerrariumEngine(ref)
  return <canvas ref={ref} />
}

describe('useTerrariumEngine', () => {
  let callbacks: Map<number, FrameRequestCallback>
  let nextId: number
  let ctxCalls: string[]
  const cancel = vi.fn()

  const runFrame = (t: number) => {
    const pending = [...callbacks.entries()]
    callbacks.clear()
    pending.forEach(([, cb]) => cb(t))
  }

  beforeEach(() => {
    appStore.set(resetOverlayAtom)
    appStore.set(patchStudioAtom, { awayLog: [] })
    appStore.set(patchAccountAtom, { phase: 'signedout' })
    callbacks = new Map()
    nextId = 1
    cancel.mockClear()
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      callbacks.set(nextId, cb)
      return nextId++
    })
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      cancel(id)
      callbacks.delete(id)
    })
    const rec = makeRecordingContext()
    ctxCalls = rec.calls
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      rec.ctx as unknown as ReturnType<HTMLCanvasElement['getContext']>,
    )
    configureSpriteCache(
      () => ({ width: 0, height: 0, getContext: () => null }) as unknown as HTMLCanvasElement,
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    configureSpriteCache()
    appStore.set(resetAccountAtom)
  })

  it('starts exactly one loop, keeps it single across frames, and stops on unmount', () => {
    const { unmount } = render(<Harness />)
    expect(callbacks.size).toBe(1)
    const clips = () => ctxCalls.filter((c) => c === 'clip').length
    runFrame(16)
    const firstFrame = clips()
    runFrame(32)
    expect(callbacks.size).toBe(1)
    // Two frames; each clips the vessel, plus the bank cut and gravel bed when there is a pool,
    // plus each ground shadow's own clips, so the second frame repeats the first.
    const vesselClips = 1 + (hasPool(appStore.get(waterSplitAtom)) ? 2 : 0)
    expect(firstFrame).toBeGreaterThanOrEqual(vesselClips)
    expect(clips()).toBe(2 * firstFrame)
    unmount()
    expect(callbacks.size).toBe(0)
    expect(cancel).toHaveBeenCalled()
  })

  it('never writes worldSnapshot during frames and flushes telemetry at most once per 250 ms', () => {
    render(<Harness />)
    // Subscribe after mount so the first-run seeding commit is not counted.
    let snapshotWrites = 0
    let telemetryWrites = 0
    let otherWrites = 0
    let prevSnapshot = appStore.get(worldSnapshotAtom)
    const unsubscribe = appStore.sub(studioStateAtom, () => {
      const snapshot = appStore.get(worldSnapshotAtom)
      if (snapshot !== prevSnapshot) snapshotWrites++
      else otherWrites++
      prevSnapshot = snapshot
    })
    const unsubscribeTelemetry = appStore.sub(telemetryAtom, () => telemetryWrites++)
    const simulatedMs = 2000
    for (let t = 16; t <= simulatedMs; t += 16) runFrame(t)
    unsubscribe()
    unsubscribeTelemetry()
    expect(snapshotWrites).toBe(0)
    expect(telemetryWrites).toBeLessThanOrEqual(Math.ceil(simulatedMs / 250))
    // The seeded scene has cleanup crew the default telemetry does not, so the flush really happened.
    expect(telemetryWrites).toBeGreaterThanOrEqual(1)
    expect(otherWrites).toBe(0)
  })

  it('seeds the environment from the persisted envSeed, falling back per field', () => {
    appStore.set(patchStudioAtom, {
      envSeed: { humidity: 64, temperature: Number.NaN, soilMoisture: 51, nutrients: 30 },
    })
    try {
      const { unmount } = render(<Harness />)
      const env = getWorld().env
      expect(env.nutrients).toBe(30)
      expect(env.humidity).toBe(64)
      expect(env.soilMoisture).toBe(51)
      expect(env.temperature).toBe(24.5)
      expect(env.o2).toBe(96)
      unmount()
    } finally {
      appStore.set(patchStudioAtom, { envSeed: createDefaultState().envSeed })
    }
  })

  it('a world mounted after setEnvSeed reads the seeded nutrients', () => {
    appStore.set(envSeedAtom, { ...appStore.get(envSeedAtom), nutrients: 30 })
    try {
      const { unmount } = render(<Harness />)
      expect(getWorld().env.nutrients).toBe(30)
      unmount()
    } finally {
      appStore.set(patchStudioAtom, { envSeed: createDefaultState().envSeed })
    }
  })

  it('commits exactly once after in-flight pour particles land, none while they fall', async () => {
    render(<Harness />)
    const world = getWorld()
    appStore.set(patchStudioAtom, { activeTool: 'pour', activePourMaterial: 'soil' })
    world.pointerNorm = { x: 0.5, y: 0.3 }
    world.isPouring = true
    let t = 0
    runFrame((t += 16))
    expect(world.fallingStreams.length).toBeGreaterThan(0)
    // Pointer-up: the pour ends with particles still in the air.
    world.isPouring = false
    let commits = 0
    // sub only fires when worldSnapshot is replaced.
    const unsubscribe = appStore.sub(worldSnapshotAtom, () => commits++)
    runFrame((t += 16))
    await Promise.resolve()
    expect(world.fallingStreams.length).toBeGreaterThan(0)
    expect(commits).toBe(0)
    for (let i = 0; i < 600 && world.fallingStreams.length; i++) runFrame((t += 16))
    expect(world.fallingStreams.length).toBe(0)
    await Promise.resolve()
    expect(commits).toBe(1)
    for (let i = 0; i < 20; i++) runFrame((t += 16))
    await Promise.resolve()
    expect(commits).toBe(1)
    unsubscribe()
  })

  it('pauses while the document is hidden and resumes when visible', () => {
    render(<Harness />)
    const hidden = vi.spyOn(document, 'hidden', 'get')
    hidden.mockReturnValue(true)
    document.dispatchEvent(new Event('visibilitychange'))
    expect(callbacks.size).toBe(0)
    hidden.mockReturnValue(false)
    document.dispatchEvent(new Event('visibilitychange'))
    expect(callbacks.size).toBe(1)
  })

  it('flushes the env seed when the tab hides and on unmount, ahead of the 5 s cadence', () => {
    const { unmount } = render(<Harness />)
    const hidden = vi.spyOn(document, 'hidden', 'get')
    mutateWorld((w) => {
      w.env.nutrients = 30
    })
    hidden.mockReturnValue(true)
    document.dispatchEvent(new Event('visibilitychange'))
    expect(appStore.get(envSeedAtom).nutrients).toBe(30)
    hidden.mockReturnValue(false)
    document.dispatchEvent(new Event('visibilitychange'))
    mutateWorld((w) => {
      w.env.nutrients = 25
    })
    unmount()
    expect(appStore.get(envSeedAtom).nutrients).toBe(25)
  })

  it('hiding the tab commits the world snapshot and lastSimulatedAt', () => {
    const { unmount } = render(<Harness />)
    const world = getWorld()
    appStore.set(worldSnapshotAtom, null)
    appStore.set(lastSimulatedAtAtom, null)
    world.terrainContour[3] = 5
    vi.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000)
    const hidden = vi.spyOn(document, 'hidden', 'get')
    hidden.mockReturnValue(true)
    document.dispatchEvent(new Event('visibilitychange'))
    expect(appStore.get(worldSnapshotAtom)?.terrainContour[3]).toBe(5)
    expect(appStore.get(lastSimulatedAtAtom)).toBe(1_800_000_000_000)
    hidden.mockReturnValue(false)
    document.dispatchEvent(new Event('visibilitychange'))
    appStore.set(lastSimulatedAtAtom, null)
    unmount()
    expect(appStore.get(lastSimulatedAtAtom)).toBe(1_800_000_000_000)
  })

  it('seeds ecoTime from the stored day count so an old save keeps its day', () => {
    appStore.set(patchStudioAtom, { dayCount: 7, worldSnapshot: null })
    const { unmount } = render(<Harness />)
    expect(getWorld().ecoTime).toBe(6)
    // A snapshot from before living time (no ecoTime) seeds the same way.
    unmount()
    appStore.set(patchStudioAtom, { dayCount: 5, worldSnapshot: { items: [], terrainContour: [] } })
    const second = render(<Harness />)
    expect(getWorld().ecoTime).toBe(4)
    for (let t = 16; t <= 600; t += 16) runFrame(t)
    expect(appStore.get(dayCountAtom)).toBe(5)
    second.unmount()
    appStore.set(patchStudioAtom, { dayCount: 1, worldSnapshot: null })
  })

  it('hiding the tab flushes the day count before committing', () => {
    const { unmount } = render(<Harness />)
    getWorld().ecoTime = 3.2
    const hidden = vi.spyOn(document, 'hidden', 'get')
    hidden.mockReturnValue(true)
    document.dispatchEvent(new Event('visibilitychange'))
    expect(appStore.get(dayCountAtom)).toBe(4)
    hidden.mockReturnValue(false)
    document.dispatchEvent(new Event('visibilitychange'))
    unmount()
    appStore.set(patchStudioAtom, { dayCount: 1 })
  })

  it('registers its world, skips its own snapshots, applies external ones, and unregisters', () => {
    const { unmount } = render(<Harness />)
    const world = getWorld()
    const contourBefore = world.terrainContour
    const itemsBefore = world.items
    mutateWorld((w) => {
      w.terrainContour[0] = 7
    })
    expect(appStore.get(worldSnapshotAtom)?.terrainContour[0]).toBe(7)
    // Own write: restoreWorld skipped, so the world's arrays are not replaced.
    expect(world.terrainContour).toBe(contourBefore)
    expect(world.items).toBe(itemsBefore)

    const external = { items: [], terrainContour: new Array<number>(21).fill(1) }
    appStore.set(worldSnapshotAtom, external)
    expect(world.terrainContour[0]).toBe(1)
    expect(world.terrainContour).not.toBe(contourBefore)

    unmount()
    expect(() => getWorld()).toThrow(/no world registered/)
    unregisterWorld()
  })

  it('runs catch-up on mount when lastSimulatedAt is 2 h old and opens the card', () => {
    appStore.set(patchStudioAtom, {
      lastSimulatedAt: Date.now() - 2 * 3_600_000,
      catchupEnabled: true,
    })
    const { unmount } = render(<Harness />)
    const r = appStore.get(awayLogAtom)[0]
    expect(r).toBeDefined()
    expect(r?.mode).toBe('away')
    expect(appStore.get(awayIndexAtom)).toBe(0)
    unmount()
  })

  it('pushes nothing on mount when lastSimulatedAt is 1 min old', () => {
    appStore.set(patchStudioAtom, { lastSimulatedAt: Date.now() - 60_000, catchupEnabled: true })
    const { unmount } = render(<Harness />)
    expect(appStore.get(awayLogAtom)).toHaveLength(0)
    expect(appStore.get(awayIndexAtom)).toBeNull()
    unmount()
  })

  it('runs catch-up when the tab becomes visible again after a long gap', () => {
    const { unmount } = render(<Harness />)
    const hidden = vi.spyOn(document, 'hidden', 'get')
    hidden.mockReturnValue(true)
    document.dispatchEvent(new Event('visibilitychange'))
    expect(appStore.get(awayLogAtom)).toHaveLength(0)
    appStore.set(patchStudioAtom, { lastSimulatedAt: Date.now() - 3 * 3_600_000 })
    hidden.mockReturnValue(false)
    document.dispatchEvent(new Event('visibilitychange'))
    expect(appStore.get(awayLogAtom)[0]?.mode).toBe('away')
    expect(appStore.get(awayIndexAtom)).toBe(0)
    unmount()
  })

  it('still registers the world and starts the loop when catch-up throws, and skips that gap', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.mocked(catchup.runCatchUpIfDue).mockImplementationOnce(() => {
      throw new Error('boom')
    })
    appStore.set(patchStudioAtom, {
      lastSimulatedAt: Date.now() - 2 * 3_600_000,
      catchupEnabled: true,
    })
    const { unmount } = render(<Harness />)
    expect(spy).toHaveBeenCalled()
    expect(getWorld()).toBeDefined()
    expect(callbacks.size).toBe(1)
    const last = appStore.get(lastSimulatedAtAtom)
    expect(last).not.toBeNull()
    expect(Date.now() - (last ?? 0)).toBeLessThan(60_000)
    expect(appStore.get(awayLogAtom)).toHaveLength(0)
    unmount()
  })

  it('defers the mount catch-up while the account is checking and runs it once the phase settles', () => {
    appStore.set(patchAccountAtom, { phase: 'checking' })
    appStore.set(patchStudioAtom, {
      lastSimulatedAt: Date.now() - 2 * 3_600_000,
      catchupEnabled: true,
    })
    const { unmount } = render(<Harness />)
    expect(appStore.get(awayLogAtom)).toHaveLength(0)
    expect(appStore.get(awayIndexAtom)).toBeNull()
    act(() => appStore.set(patchAccountAtom, { phase: 'signedout' }))
    expect(appStore.get(awayLogAtom)).toHaveLength(1)
    expect(appStore.get(awayIndexAtom)).toBe(0)
    act(() => appStore.set(patchAccountAtom, { phase: 'checking' }))
    act(() => appStore.set(patchAccountAtom, { phase: 'signedout' }))
    expect(appStore.get(awayLogAtom)).toHaveLength(1)
    unmount()
  })

  it('signing in during the check catches up the cloud garden once, journals it, and points the card at it', async () => {
    const user: PublicUser = {
      id: 'u_engine',
      name: 'Engine Test',
      email: 'engine@botanica.app',
      verified: true,
      provider: 'password',
      createdAt: 1,
    }
    const session: Session = {
      userId: user.id,
      email: user.email,
      version: 1,
      remember: true,
      createdAt: Date.now(),
      expiresAt: Date.now() + 86_400_000,
      device: 'Test on jsdom',
    }
    // The account singleton's backend factory defaults to the local backend over localStorage.
    const backend = createLocalBackend(user.id)
    const snapshot = staleGarden(3, 'cloud-fern')
    await backend.saveGarden('g_cloud', {
      name: 'Cloud',
      createdAt: 1,
      updatedAt: 1,
      summary: { vessel: 'globe', day: 1, plants: 1, animals: 0 },
      snapshot,
    })
    await backend.setProfile({ activeGardenId: 'g_cloud' })
    appStore.set(patchAccountAtom, { phase: 'checking' })
    // The local save is stale too: its gap must not be reported once the cloud garden replaces it.
    appStore.set(patchStudioAtom, {
      lastSimulatedAt: Date.now() - 5 * 3_600_000,
      catchupEnabled: true,
    })
    const { unmount } = render(<Harness />)
    expect(appStore.get(awayLogAtom)).toHaveLength(0)

    try {
      await act(async () => {
        await account.beginSession(user, session, { isNew: false })
      })
      const log = appStore.get(awayLogAtom)
      expect(log).toHaveLength(1)
      expect(log[0]?.from).toBe(snapshot.lastSimulatedAt)
      expect(getWorld().items.map((i) => i.uid)).toContain('cloud-fern')
      expect(appStore.get(awayIndexAtom)).toBe(0)
      await vi.waitFor(() => expect(appStore.get(journalAtom)).toHaveLength(1))
      expect(appStore.get(journalAtom)[0]).toMatchObject({
        auto: true,
        key: `away:${log[0]?.from}:${log[0]?.to}`,
      })
    } finally {
      await backend.deleteAll()
    }
    unmount()
  })

  it('opening another garden catches it up right away and closes the previous card', () => {
    appStore.set(patchStudioAtom, { lastSimulatedAt: Date.now(), catchupEnabled: true })
    const { unmount } = render(<Harness />)
    appStore.set(openAwayAtom, 0)
    const snapshot = staleGarden(4, 'other-fern')
    act(() => applyGardenSnapshot(snapshot, appStore))
    const log = appStore.get(awayLogAtom)
    expect(log).toHaveLength(1)
    expect(log[0]?.from).toBe(snapshot.lastSimulatedAt)
    expect(appStore.get(awayIndexAtom)).toBe(0)

    // A fresh garden (no gap) leaves no stale card open on the new garden's log.
    act(() => applyGardenSnapshot(staleGarden(0, 'fresh-fern'), appStore))
    expect(appStore.get(awayLogAtom)).toHaveLength(0)
    expect(appStore.get(awayIndexAtom)).toBeNull()
    unmount()
  })
  it('holds the camera and drawing until the app sizes the canvas, so a desktop does not start zoomed', () => {
    const { container, unmount } = render(<UnsizedHarness />)
    const canvas = container.querySelector('canvas')!
    expect(canvas.width).toBe(300)
    expect(canvas.height).toBe(150)
    runFrame(16)
    runFrame(32)
    // The 300 x 150 default must not run the phone start (which would latch a close-up) or draw.
    expect(getWorld().view.framedOnce).toBe(false)
    expect(getWorld().view.size).toBeNull()
    expect(ctxCalls.filter((c) => c === 'clip')).toHaveLength(0)

    // The app's resize lands: a desktop canvas shows the whole tank.
    canvas.width = 1200
    canvas.height = 800
    runFrame(48)
    expect(getWorld().view.framedOnce).toBe(true)
    expect(getWorld().view.size).toEqual({ w: 1200, h: 800 })
    expect(getWorld().view.camT).toEqual({ z: 1, u: 0.5, v: 0.5 })
    expect(ctxCalls.filter((c) => c === 'clip').length).toBeGreaterThan(0)
    unmount()
  })
})
