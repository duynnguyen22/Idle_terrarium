import { render } from '@testing-library/react'
import { useRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mutateWorld, getWorld, unregisterWorld } from '@/engine/engineBridge'
import { hasPool } from '@/engine/geometry'
import { configureSpriteCache } from '@/engine/sprites/spriteCache'
import { useTerrariumEngine } from '@/hooks/useTerrariumEngine'
import { createDefaultState, useStudioStore } from '@/store/useStudioStore'
import { useTelemetryStore } from '@/store/useTelemetryStore'
import { makeRecordingContext } from '../helpers/recordingContext'

function Harness() {
  const ref = useRef<HTMLCanvasElement>(null)
  useTerrariumEngine(ref)
  return <canvas ref={ref} width={800} height={600} />
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
  })

  it('starts exactly one loop, keeps it single across frames, and stops on unmount', () => {
    const { unmount } = render(<Harness />)
    expect(callbacks.size).toBe(1)
    runFrame(16)
    runFrame(32)
    expect(callbacks.size).toBe(1)
    // Two frames; each clips the vessel, plus the bank cut and gravel bed when there is a pool.
    const clipsPerFrame = 1 + (hasPool(useStudioStore.getState().waterSplit) ? 2 : 0)
    expect(ctxCalls.filter((c) => c === 'clip').length).toBe(2 * clipsPerFrame)
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
    const unsubscribe = useStudioStore.subscribe((s, prev) => {
      if (s.worldSnapshot !== prev.worldSnapshot) snapshotWrites++
      else otherWrites++
    })
    const unsubscribeTelemetry = useTelemetryStore.subscribe(() => telemetryWrites++)
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
    useStudioStore.setState({
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
      useStudioStore.setState({ envSeed: createDefaultState().envSeed })
    }
  })

  it('a world mounted after setEnvSeed reads the seeded nutrients', () => {
    useStudioStore.getState().setEnvSeed({ ...useStudioStore.getState().envSeed, nutrients: 30 })
    try {
      const { unmount } = render(<Harness />)
      expect(getWorld().env.nutrients).toBe(30)
      unmount()
    } finally {
      useStudioStore.setState({ envSeed: createDefaultState().envSeed })
    }
  })

  it('commits exactly once after in-flight pour particles land, none while they fall', async () => {
    render(<Harness />)
    const world = getWorld()
    useStudioStore.setState({ activeTool: 'pour', activePourMaterial: 'soil' })
    world.pointerNorm = { x: 0.5, y: 0.3 }
    world.isPouring = true
    let t = 0
    runFrame((t += 16))
    expect(world.fallingStreams.length).toBeGreaterThan(0)
    // Pointer-up: the pour ends with particles still in the air.
    world.isPouring = false
    let commits = 0
    const unsubscribe = useStudioStore.subscribe((s, prev) => {
      if (s.worldSnapshot !== prev.worldSnapshot) commits++
    })
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
    expect(useStudioStore.getState().envSeed.nutrients).toBe(30)
    hidden.mockReturnValue(false)
    document.dispatchEvent(new Event('visibilitychange'))
    mutateWorld((w) => {
      w.env.nutrients = 25
    })
    unmount()
    expect(useStudioStore.getState().envSeed.nutrients).toBe(25)
  })

  it('hiding the tab commits the world snapshot and lastSimulatedAt', () => {
    const { unmount } = render(<Harness />)
    const world = getWorld()
    useStudioStore.getState().setWorldSnapshot(null)
    useStudioStore.getState().setLastSimulatedAt(null)
    world.terrainContour[3] = 5
    vi.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000)
    const hidden = vi.spyOn(document, 'hidden', 'get')
    hidden.mockReturnValue(true)
    document.dispatchEvent(new Event('visibilitychange'))
    expect(useStudioStore.getState().worldSnapshot?.terrainContour[3]).toBe(5)
    expect(useStudioStore.getState().lastSimulatedAt).toBe(1_800_000_000_000)
    hidden.mockReturnValue(false)
    document.dispatchEvent(new Event('visibilitychange'))
    useStudioStore.getState().setLastSimulatedAt(null)
    unmount()
    expect(useStudioStore.getState().lastSimulatedAt).toBe(1_800_000_000_000)
  })

  it('seeds ecoTime from the stored day count so an old save keeps its day', () => {
    useStudioStore.setState({ dayCount: 7, worldSnapshot: null })
    const { unmount } = render(<Harness />)
    expect(getWorld().ecoTime).toBe(6)
    // A snapshot from before living time (no ecoTime) seeds the same way.
    unmount()
    useStudioStore.setState({ dayCount: 5, worldSnapshot: { items: [], terrainContour: [] } })
    const second = render(<Harness />)
    expect(getWorld().ecoTime).toBe(4)
    for (let t = 16; t <= 600; t += 16) runFrame(t)
    expect(useStudioStore.getState().dayCount).toBe(5)
    second.unmount()
    useStudioStore.setState({ dayCount: 1, worldSnapshot: null })
  })

  it('hiding the tab flushes the day count before committing', () => {
    const { unmount } = render(<Harness />)
    getWorld().ecoTime = 3.2
    const hidden = vi.spyOn(document, 'hidden', 'get')
    hidden.mockReturnValue(true)
    document.dispatchEvent(new Event('visibilitychange'))
    expect(useStudioStore.getState().dayCount).toBe(4)
    hidden.mockReturnValue(false)
    document.dispatchEvent(new Event('visibilitychange'))
    unmount()
    useStudioStore.setState({ dayCount: 1 })
  })

  it('registers its world, skips its own snapshots, applies external ones, and unregisters', () => {
    const { unmount } = render(<Harness />)
    const world = getWorld()
    const contourBefore = world.terrainContour
    const itemsBefore = world.items
    mutateWorld((w) => {
      w.terrainContour[0] = 7
    })
    expect(useStudioStore.getState().worldSnapshot?.terrainContour[0]).toBe(7)
    // Own write: restoreWorld skipped, so the world's arrays are not replaced.
    expect(world.terrainContour).toBe(contourBefore)
    expect(world.items).toBe(itemsBefore)

    const external = { items: [], terrainContour: new Array<number>(21).fill(1) }
    useStudioStore.getState().setWorldSnapshot(external)
    expect(world.terrainContour[0]).toBe(1)
    expect(world.terrainContour).not.toBe(contourBefore)

    unmount()
    expect(() => getWorld()).toThrow(/no world registered/)
    unregisterWorld()
  })
})
