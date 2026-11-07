import { beforeEach, describe, expect, it } from 'vitest'
import { FAUNA } from '@/data/catalog'
import type { PlacedItem } from '@/data/types'
import { getSoilSurfaceNormalizedY } from '@/engine/geometry'
import { advanceClock, lightingForHour } from '@/engine/simulation/clock'
import { FRAME_MS } from '@/engine/simulation/constants'
import { updateFauna } from '@/engine/simulation/fauna'
import { advanceDay, updateGrowth } from '@/engine/simulation/growth'
import { addSporePatch, updateMold } from '@/engine/simulation/mold'
import {
  initWorldParticles,
  updateAmbientMotes,
  updateFireflies,
} from '@/engine/simulation/particles'
import { siphonStep, spawnPourStream, stepPourParticles } from '@/engine/simulation/pouring'
import { pushTelemetry, TELEMETRY_INTERVAL_MS } from '@/engine/simulation/telemetry'
import { syncChildren, tick } from '@/engine/simulation/tick'
import { createWorld } from '@/engine/world'
import { createStudioStore } from '@/store/useStudioStore'

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const item = (
  o: Partial<PlacedItem> & Pick<PlacedItem, 'uid' | 'id' | 'category'>,
): PlacedItem => ({
  x: 0.5,
  y: 0.5,
  scale: 1,
  rotation: 0,
  flipX: false,
  zIndex: 1,
  ...o,
})

let store: ReturnType<typeof createStudioStore>
beforeEach(() => {
  localStorage.clear()
  store = createStudioStore()
})

describe('lightingForHour', () => {
  it('switches at the prototype boundaries', () => {
    expect(lightingForHour(5.49)).toBe('night')
    expect(lightingForHour(5.5)).toBe('dawn')
    expect(lightingForHour(8.49)).toBe('dawn')
    expect(lightingForHour(8.5)).toBe('sunlight')
    expect(lightingForHour(17.49)).toBe('sunlight')
    expect(lightingForHour(17.5)).toBe('twilight')
    expect(lightingForHour(19.99)).toBe('twilight')
    expect(lightingForHour(20)).toBe('night')
    expect(lightingForHour(0)).toBe('night')
  })
  it('advanceClock only writes on change and honours autoLightSync', () => {
    const noon = new Date(2026, 0, 1, 12, 0)
    store.getState().setLighting('night')
    expect(advanceClock(store.getState(), noon)).toBe(true)
    expect(store.getState().lighting).toBe('sunlight')
    expect(advanceClock(store.getState(), noon)).toBe(false)
    store.getState().setAutoLightSync(false)
    store.getState().setLighting('night')
    expect(advanceClock(store.getState(), noon)).toBe(false)
    expect(store.getState().lighting).toBe('night')
  })
})

describe('fauna', () => {
  it('stays inside its habitat band for 10,000 steps', () => {
    const rng = mulberry32(7)
    const swimmer = FAUNA.find((f) => 'swimsInWater' in f && f.swimsInWater)
    const walker = FAUNA.find((f) => !('swimsInWater' in f && f.swimsInWater))
    expect(swimmer && walker).toBeTruthy()
    const world = createWorld()
    world.items.push(
      item({ uid: 's', id: swimmer!.id, category: 'fauna', x: 0.5, y: 0.7 }),
      item({ uid: 'w', id: walker!.id, category: 'fauna', x: 0.5, y: 0.6 }),
    )
    const state = store.getState()
    const surface = getSoilSurfaceNormalizedY({
      substrates: state.substrates,
      waterSplit: state.waterSplit,
    })
    for (let i = 0; i < 10_000; i++) {
      updateFauna(world, state, FRAME_MS, i * FRAME_MS, rng)
      for (const f of world.items) {
        expect(f.x).toBeGreaterThanOrEqual(0.24)
        expect(f.x).toBeLessThanOrEqual(0.76)
      }
      expect(world.items[0].y).toBeGreaterThanOrEqual(surface + 0.04 - 0.015 - 1e-9)
      expect(world.items[0].y).toBeLessThanOrEqual(surface + 0.04 + 0.015 + 1e-9)
      expect(world.items[1].y).toBe(0.6)
    }
  })
  it('skips the dragged item', () => {
    const world = createWorld()
    world.items.push(
      item({
        uid: 'w',
        id: FAUNA[0].id,
        category: 'fauna',
        aiTimer: 5,
        vx: 0.01,
        aiState: 'wandering',
      }),
    )
    world.draggingId = 'w'
    updateFauna(world, store.getState(), FRAME_MS, 0, mulberry32(1))
    expect(world.items[0].x).toBe(0.5)
    expect(world.items[0].aiTimer).toBe(5)
  })
})

describe('growth', () => {
  it('sprout reaches mature after ~3200 frames and +1 Day makes it lush', () => {
    const world = createWorld()
    world.items.push(
      item({
        uid: 'p',
        id: 'boston_fern',
        category: 'flora',
        stage: 'sprout',
        growthProgress: 0.2,
      }),
    )
    const state = store.getState()
    for (let i = 0; i < 3100; i++) updateGrowth(world, state, FRAME_MS)
    expect(world.items[0].stage).toBe('sprout')
    for (let i = 0; i < 200; i++) updateGrowth(world, state, FRAME_MS)
    expect(world.items[0].stage).toBe('mature')
    expect(world.items[0].scale).toBe(1.05)
    const day = state.dayCount
    advanceDay(world, state)
    expect(world.items[0].stage).toBe('lush')
    expect(world.items[0].scale).toBeCloseTo(1.05 * 1.06)
    expect(store.getState().dayCount).toBe(day + 1)
  })
  it('5x speed grows 3.5x faster', () => {
    const w = createWorld()
    w.items.push(
      item({
        uid: 'p',
        id: 'boston_fern',
        category: 'flora',
        stage: 'sprout',
        growthProgress: 0.2,
      }),
    )
    updateGrowth(w, { timeSpeed: 5 }, FRAME_MS)
    expect(w.items[0].growthProgress).toBeCloseTo(0.2 + 0.00025 * 3.5)
  })
})

describe('mold', () => {
  const crew = FAUNA.find((f) => 'cleansMold' in f && f.cleansMold)!
  it('shrinks and clears with a detritivore, stays put without', () => {
    const world = createWorld()
    addSporePatch(world, mulberry32(3))
    addSporePatch(world, mulberry32(4))
    const sizes = world.moldPatches.map((p) => p.size)
    updateMold(world, { timeSpeed: 1 }, FRAME_MS)
    expect(world.moldPatches.map((p) => p.size)).toEqual(sizes)
    world.items.push(item({ uid: 'c', id: crew.id, category: 'fauna' }))
    updateMold(world, { timeSpeed: 1 }, FRAME_MS)
    expect(world.moldPatches[0].size as number).toBeCloseTo((sizes[0] as number) - 0.012)
    for (let i = 0; i < 1500; i++) updateMold(world, { timeSpeed: 1 }, FRAME_MS)
    expect(world.moldPatches.length).toBe(0)
  })
})

describe('particles', () => {
  it('initialises the prototype populations and keeps motes wrapped', () => {
    const world = createWorld()
    initWorldParticles(world, mulberry32(1))
    expect(world.ambientMotes.length).toBe(32)
    expect(world.fireflies.length).toBe(16)
    expect(world.substrateGrains.length).toBe(260)
    expect(world.mossCarpet.length).toBe(6)
    for (let i = 0; i < 5000; i++) {
      updateAmbientMotes(world, FRAME_MS)
      updateFireflies(world, FRAME_MS)
    }
    for (const m of world.ambientMotes) {
      expect(m.y as number).toBeGreaterThanOrEqual(0.15)
      expect(m.y as number).toBeLessThanOrEqual(0.77)
    }
  })
  it('fireflies bounce at the edges', () => {
    const world = createWorld()
    world.fireflies.push({ x: 0.2, y: 0.5, vx: -0.001, vy: 0 })
    updateFireflies(world, FRAME_MS)
    expect(world.fireflies[0].vx).toBe(0.001)
  })
})

describe('pouring', () => {
  it('200 soil particles raise substrates.soil and the targeted contour index', () => {
    const rng = mulberry32(11)
    const world = createWorld()
    world.pointerNorm = { x: 0.5, y: 0.3 }
    const before = store.getState().substrates.soil
    for (let i = 0; i < 100; i++) spawnPourStream(world, 'soil', rng)
    expect(world.fallingStreams.length).toBe(200)
    for (let i = 0; i < 600 && world.fallingStreams.length; i++)
      stepPourParticles(world, store.getState(), FRAME_MS, rng)
    expect(world.fallingStreams.length).toBe(0)
    expect(world.surfaceGrains.length).toBe(200)
    expect(world.terrainContour[10]).toBeGreaterThan(0)
    expect(world.terrainContour[10]).toBe(Math.max(...world.terrainContour))
    expect(Math.max(...world.terrainContour)).toBeLessThanOrEqual(18)
    pushTelemetry(world, store.getState(), 1000)
    expect(store.getState().substrates.soil).toBeGreaterThan(before)
    expect(store.getState().substrates.soil).toBeLessThanOrEqual(45)
  })
  it('water landings raise water and the mist boost (capped at 20)', () => {
    const rng = mulberry32(2)
    const world = createWorld()
    for (let i = 0; i < 40; i++) spawnPourStream(world, 'water', rng)
    for (let i = 0; i < 600; i++) stepPourParticles(world, store.getState(), FRAME_MS, rng)
    pushTelemetry(world, store.getState(), 1000)
    expect(store.getState().substrates.water).toBeGreaterThan(24)
    expect(world.env.mistBoost).toBeGreaterThan(0)
    expect(world.env.mistBoost).toBeLessThanOrEqual(20)
  })
  it('flags pourSettled only once the pour has ended and the last particle landed', () => {
    const rng = mulberry32(3)
    const world = createWorld()
    world.pointerNorm = { x: 0.5, y: 0.3 }
    world.isPouring = true
    spawnPourStream(world, 'soil', rng)
    for (let i = 0; i < 600 && world.fallingStreams.length; i++)
      stepPourParticles(world, store.getState(), FRAME_MS, rng)
    expect(world.pourSettled).toBe(false) // still pouring
    spawnPourStream(world, 'soil', rng)
    world.isPouring = false
    stepPourParticles(world, store.getState(), FRAME_MS, rng)
    expect(world.pourSettled).toBe(false) // in flight
    for (let i = 0; i < 600 && world.fallingStreams.length; i++)
      stepPourParticles(world, store.getState(), FRAME_MS, rng)
    expect(world.pourSettled).toBe(true)
  })
  it('caps surface grains at 220', () => {
    const rng = mulberry32(5)
    const world = createWorld()
    for (let i = 0; i < 150; i++) spawnPourStream(world, 'sand', rng)
    for (let i = 0; i < 600; i++) stepPourParticles(world, store.getState(), FRAME_MS, rng)
    expect(world.surfaceGrains.length).toBe(220)
  })
  it('siphonStep never drops anything below 0 and drains water first', () => {
    const world = createWorld()
    for (let i = 0; i < 3000; i++) siphonStep(world, store.getState())
    pushTelemetry(world, store.getState(), 1000)
    const s = store.getState().substrates
    for (const v of Object.values(s)) expect(v).toBeGreaterThanOrEqual(0)
    expect(s.water).toBe(0)
    const w2 = createWorld()
    siphonStep(w2, {
      waterSplit: store.getState().waterSplit,
      substrates: { ...store.getState().substrates, water: 24 },
    })
    expect(w2.pendingSubstrates.water).toBeCloseTo(-0.35)
    expect(w2.pendingSubstrates.soil).toBeUndefined()
  })
})

describe('pushTelemetry', () => {
  it('writes at most 4x per simulated second and skips unchanged values', () => {
    const world = createWorld()
    world.moldPatches.push({ x: 0.3, size: 12 })
    let writes = 0
    const unsub = store.subscribe(() => writes++)
    let flushes = 0
    for (let t = 1000; t < 2000; t += FRAME_MS)
      if (pushTelemetry(world, store.getState(), t)) flushes++
    unsub()
    expect(flushes).toBeLessThanOrEqual(1000 / TELEMETRY_INTERVAL_MS)
    expect(flushes).toBeGreaterThanOrEqual(3)
    expect(writes).toBe(1) // moldCount changed once; later flushes are no-ops
    expect(store.getState().telemetry.moldCount).toBe(1)
    expect(store.getState().telemetry.cleanupCrewCount).toBe(0)
  })
  it('pushTelemetry flushes env, cycle progress and pending water split', () => {
    const w = createWorld()
    w.env.temperature = 30
    w.env.cycleProgress = 0.3
    w.pendingWaterSplit = 0.3
    pushTelemetry(w, store.getState(), 1000)
    expect(store.getState().telemetry.temperature).toBe(30)
    expect(store.getState().cycleProgress).toBe(0.3)
    expect(store.getState().waterSplit).toBe(0.3)
    expect(w.pendingWaterSplit).toBeUndefined()
  })
})

describe('tick', () => {
  it('syncs children, clears orphans and skips the dragged child', () => {
    const world = createWorld()
    world.items.push(
      item({ uid: 'r', id: 'moss_wall_cliff', category: 'hardscape', x: 0.4, y: 0.6 }),
      item({
        uid: 'c',
        id: 'boston_fern',
        category: 'flora',
        parentUid: 'r',
        offsetX: 0.1,
        offsetY: -0.1,
      }),
      item({ uid: 'o', id: 'boston_fern', category: 'flora', parentUid: 'gone', x: 0.9 }),
    )
    syncChildren(world)
    expect(world.items[1].x).toBeCloseTo(0.5)
    expect(world.items[1].y).toBeCloseTo(0.5)
    expect(world.items[2].parentUid).toBeNull()
    world.items[1].x = 0.1
    world.draggingId = 'c'
    syncChildren(world)
    expect(world.items[1].x).toBe(0.1)
  })
  it('timeSpeed 0 pauses biology and motes; pouring spawns and lands via the store', () => {
    const world = createWorld()
    world.items.push(
      item({
        uid: 'p',
        id: 'boston_fern',
        category: 'flora',
        stage: 'sprout',
        growthProgress: 0.2,
      }),
    )
    store.getState().setTimeSpeed(0)
    const rng = mulberry32(9)
    tick(world, FRAME_MS, 1000, { store: store.getState(), rng })
    const y0 = world.ambientMotes[0].y
    tick(world, FRAME_MS, 1016, { store: store.getState(), rng })
    expect(world.items[0].growthProgress).toBe(0.2)
    expect(world.ambientMotes[0].y).toBe(y0)

    store.getState().setTimeSpeed(1)
    store.getState().setActiveTool('pour')
    store.getState().setActivePourMaterial('soil')
    world.isPouring = true
    for (let i = 0; i < 120; i++)
      tick(world, FRAME_MS, 2000 + i * FRAME_MS, { store: store.getState(), rng })
    expect(world.fallingStreams.length + world.surfaceGrains.length).toBeGreaterThan(0)
    expect(world.items[0].growthProgress as number).toBeGreaterThan(0.2)
    expect(world.ambientMotes[0].y).not.toBe(y0)
  })
})

describe('care report in the tick', () => {
  it('tick refreshes the care report every 30 frames', () => {
    const w = createWorld()
    w.env.humidity = 95
    w.items = [item({ uid: 'tree_frog', id: 'tree_frog', category: 'fauna' })]
    for (let i = 0; i < 30; i++) tick(w, 1000 / 60, i * 16, { store: store.getState() })
    expect(w.careIssues.some((c) => c.text.startsWith('Red-Eyed Tree Frog prefers'))).toBe(true)
  })
})
