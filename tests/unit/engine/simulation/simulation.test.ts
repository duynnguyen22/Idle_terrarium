import { beforeEach, describe, expect, it } from 'vitest'
import { FAUNA, FAUNA_BY_ID } from '@/data/catalog'
import { DEFAULT_SUBSTRATES } from '@/data/substrates'
import type { PlacedItem } from '@/data/types'
import {
  BANK_W,
  getDividerNormX,
  getPoolBedNormY,
  getSoilSurfaceNormalizedY,
  getWaterTopNormY,
} from '@/engine/geometry'
import { addItem } from '@/engine/items'
import { advanceClock, lightingForHour } from '@/engine/simulation/clock'
import { FRAME_MS } from '@/engine/simulation/constants'
import { faunaZone, updateFauna } from '@/engine/simulation/fauna'
import { advanceDay, updateGrowth } from '@/engine/simulation/growth'
import { addSporePatch, updateMold } from '@/engine/simulation/mold'
import {
  initWorldParticles,
  updateAmbientMotes,
  updateFireflies,
} from '@/engine/simulation/particles'
import {
  MAX_CONTOUR_MM,
  siphonStep,
  spawnPourStream,
  stepPourParticles,
} from '@/engine/simulation/pouring'
import { pushTelemetry, TELEMETRY_INTERVAL_MS } from '@/engine/simulation/telemetry'
import { syncChildren, tick } from '@/engine/simulation/tick'
import { createWorld, type EngineWorld, type WorldEntity } from '@/engine/world'
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

const st = {
  timeSpeed: 1,
  substrates: DEFAULT_SUBSTRATES,
  waterSplit: 0.32,
  lighting: 'sunlight',
} as const
const terrain = { substrates: st.substrates, waterSplit: st.waterSplit }

function makeMemoryStorage(): Storage {
  const m = new Map<string, string>()
  return {
    get length() {
      return m.size
    },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, String(v)),
  }
}
const memoryStorage = makeMemoryStorage()

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
  it('zones follow the divider', () => {
    const d = getDividerNormX(0.32)
    expect(faunaZone(FAUNA_BY_ID.cherry_shrimp, st, false)).toEqual({
      minX: 0.17,
      maxX: d - BANK_W - 0.01,
    })
    expect(faunaZone(FAUNA_BY_ID.vampire_crab, st, false)).toEqual({
      minX: Math.max(0.17, d - BANK_W - 0.06),
      maxX: Math.min(0.8, d + 0.05),
    })
    expect(faunaZone(FAUNA_BY_ID.vampire_crab, st, true)).toEqual({ minX: d - 0.02, maxX: 0.8 })
    expect(faunaZone(FAUNA_BY_ID.isopod, st, false)).toEqual({ minX: d + 0.01, maxX: 0.8 })
    expect(faunaZone(FAUNA_BY_ID.isopod, { ...st, waterSplit: 0 }, false)).toEqual({
      minX: 0.2,
      maxX: 0.8,
    })
  })
  it('nocturnal land fauna hide by day and move at dusk', () => {
    const w = createWorld()
    const frog = addItem(w, 'tree_frog', 'mature', { terrain, rng: () => 0.5 })!
    for (let i = 0; i < 200; i++) updateFauna(w, st, 1000 / 60, i * 16, () => 0.5)
    expect(frog.aiState).toBe('hiding')
    expect(frog.vx).toBe(0)
    expect(frog.zIndex).toBe(0.5)
    expect(frog.y).toBeCloseTo(getSoilSurfaceNormalizedY(terrain, frog.x) - 0.11, 2)
    frog.aiTimer = 0
    updateFauna(w, { ...st, lighting: 'twilight' }, 1000 / 60, 0, () => 0.5)
    expect(frog.zIndex).toBe(40)
    expect(['wandering', 'resting', 'foraging', 'exploring']).toContain(frog.aiState)
  })
  it('water fauna bob between water top and bed', () => {
    const w = createWorld()
    const shrimp = addItem(w, 'cherry_shrimp', 'mature', { terrain, rng: () => 0.5 })!
    const ys: number[] = []
    for (let i = 0; i < 100; i++) {
      updateFauna(w, st, 1000 / 60, i * 16, () => 0.5)
      ys.push(shrimp.y)
    }
    expect(shrimp.y).toBeGreaterThanOrEqual(getWaterTopNormY(terrain))
    expect(shrimp.y).toBeLessThanOrEqual(getPoolBedNormY(terrain.substrates))
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(1e-4)
  })
  it('fauna glide back into zone when the pool is removed', () => {
    // Review Focus 3
    const w = createWorld()
    const shrimp = addItem(w, 'cherry_shrimp', 'mature', { terrain, rng: () => 0.5 })!
    shrimp.x = 0.1
    let prev = shrimp.x
    for (let i = 0; i < 300; i++) {
      updateFauna(w, { ...st, waterSplit: 0 }, 1000 / 60, i * 16, () => 0.5)
      expect(Number.isFinite(shrimp.x)).toBe(true)
      expect(shrimp.x).toBeGreaterThanOrEqual(prev - 1e-9)
      prev = shrimp.x
    }
    expect(shrimp.x).toBeGreaterThanOrEqual(0.2 - 0.01)
    expect(shrimp.x).toBeLessThanOrEqual(0.8)
    expect(shrimp.x).toBeGreaterThan(0.1)
  })
  it('frogbit floats to the water top inside the pool', () => {
    const w = createWorld()
    const pad = addItem(w, 'frogbit_pads', 'mature', { terrain, x: 0.2, y: 0.9 })!
    for (let i = 0; i < 200; i++) updateFauna(w, st, 1000 / 60, i * 16, () => 0.5)
    expect(pad.y).toBeCloseTo(getWaterTopNormY(terrain) - 0.005, 3)
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
  it('vitality drifts by humidity range', () => {
    const w = createWorld()
    const fern = addItem(w, 'peacock_fern', 'mature', { terrain })!
    fern.vitality = 50
    w.env.humidity = 50
    updateGrowth(w, { timeSpeed: 1 }, 1000 / 60)
    expect(fern.vitality).toBeCloseTo(50 - 0.003, 6)
    w.env.humidity = 80
    updateGrowth(w, { timeSpeed: 1 }, 1000 / 60)
    expect(fern.vitality).toBeCloseTo(50 - 0.003 + 0.004, 6)
    fern.vitality = 30
    w.env.humidity = 50
    updateGrowth(w, { timeSpeed: 1 }, 1000 / 60)
    expect(fern.vitality).toBe(30)
  })
  it('+1 Day advances the cycle, feeds mold chance and costs nutrients', () => {
    const store = createStudioStore(memoryStorage)
    const w = createWorld()
    w.env.cycleProgress = 0
    w.env.nutrients = 88
    const fern = addItem(w, 'peacock_fern', 'mature', { terrain })!
    fern.scale = 1.45
    advanceDay(w, store.getState(), () => 0.5)
    expect(store.getState().dayCount).toBe(2)
    expect(w.env.cycleProgress).toBeCloseTo(1 / 21, 6)
    expect(w.env.nutrients).toBe(86)
    expect(fern.scale).toBe(1.5)
    expect(fern.stage).toBe('lush')
    expect(w.moldPatches).toHaveLength(1)
    advanceDay(w, store.getState(), () => 0.7)
    expect(w.moldPatches).toHaveLength(1)
    store.getState().setSetupDay(-10)
    advanceDay(w, store.getState(), () => 0.1)
    expect(w.moldPatches).toHaveLength(1)
    const noPool = createStudioStore(memoryStorage)
    noPool.getState().setWaterSplit(0)
    const w2 = createWorld()
    advanceDay(w2, noPool.getState(), () => 0.9)
    expect(w2.env.cycleProgress).toBe(1)
  })
})

describe('mold', () => {
  it('a fresh world never blooms (bloomTimer idles at 0 until a new build arms it)', () => {
    const w = createWorld()
    const toasts: string[] = []
    updateMold(
      w,
      st,
      1000 / 60,
      () => 0.5,
      (m) => toasts.push(m),
    )
    expect([w.env.bloomTimer, w.moldPatches.length, toasts.length]).toEqual([0, 0, 0])
  })
  it('mold bloom fires once when bloomTimer hits 0 and the crew clears it', () => {
    const w = createWorld()
    w.env.bloomTimer = 1
    const toasts: string[] = []
    updateMold(
      w,
      st,
      1000 / 60,
      () => 0.5,
      (m) => toasts.push(m),
    )
    expect(w.moldPatches).toHaveLength(3)
    expect(toasts).toEqual([
      'A little white mold appeared. That is normal in a new build; the springtails will clear it.',
    ])
    updateMold(
      w,
      st,
      1000 / 60,
      () => 0.5,
      (m) => toasts.push(m),
    )
    expect(w.moldPatches).toHaveLength(3)
    expect(toasts).toHaveLength(1)
    addItem(w, 'springtails', 'mature', { terrain })
    addItem(w, 'isopod', 'mature', { terrain })
    const before = w.moldPatches[0].size as number
    updateMold(w, st, 1000 / 60, () => 0.5)
    expect(w.moldPatches[0].size).toBeCloseTo(before - 0.005, 6)
    w.moldPatches[0].size = 3
    updateMold(w, st, 1000 / 60, () => 0.5)
    expect(w.moldPatches).toHaveLength(2)
  })
  it('+Spore places a patch on land and a lone crew member eats 0.0025 per frame', () => {
    const world = createWorld()
    world.env.bloomTimer = 0
    addSporePatch(world, st, () => 0)
    expect(world.moldPatches[0]).toEqual({ x: getDividerNormX(0.32) + 0.03, size: 11 })
    updateMold(world, st, FRAME_MS, () => 0.5)
    expect(world.moldPatches[0].size).toBe(11)
    addItem(world, 'springtails', 'mature', { terrain })
    updateMold(world, st, FRAME_MS, () => 0.5)
    expect(world.moldPatches[0].size as number).toBeCloseTo(11 - 0.0025, 9)
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
    expect(store.getState().substrates.soil).toBeLessThanOrEqual(60)
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
  it('siphonStep never drops anything below 0', () => {
    const world = createWorld()
    for (let i = 0; i < 3000; i++) siphonStep(world, store.getState())
    pushTelemetry(world, store.getState(), 1000)
    const s = store.getState().substrates
    for (const v of Object.values(s)) expect(v).toBeGreaterThanOrEqual(0)
    expect(s.water).toBe(0)
  })

  const landed = (w: EngineWorld, material: string, x: number) => {
    w.fallingStreams = [{ x, y: 0.99, vx: 0, vy: 0.01, r: 3, color: '#000', materialId: material }]
  }
  it('water landing raises water by 0.14 up to 80 and starts a pool when none exists', () => {
    const w = createWorld()
    w.env.cycleProgress = 0.5
    const s = { ...st, waterSplit: 0 }
    const toasts: string[] = []
    landed(w, 'water', 0.5)
    w.fallingStreams.push({ ...w.fallingStreams[0], x: 0.6 })
    stepPourParticles(
      w,
      s,
      1000 / 60,
      () => 0.5,
      (m) => toasts.push(m),
    )
    expect(w.pendingSubstrates.water).toBeCloseTo(0.28, 6)
    expect(w.pendingWaterSplit).toBe(0.3)
    expect(w.env.cycleProgress).toBe(0)
    expect(toasts).toEqual(['Started a pool on the left. New water cycles for about 3 weeks.'])
    const full = createWorld()
    const fullToasts: string[] = []
    landed(full, 'water', 0.5)
    stepPourParticles(
      full,
      { ...st, substrates: { ...st.substrates, water: 80 } },
      1000 / 60,
      () => 0.5,
      (m) => fullToasts.push(m),
    )
    expect(full.pendingSubstrates.water ?? 0).toBe(0)
    expect(full.pendingWaterSplit).toBeUndefined()
    expect(fullToasts).toHaveLength(0)
  })
  it('water crossing 1 mm in an existing pool restarts the nitrogen cycle', () => {
    const w = createWorld()
    w.env.cycleProgress = 0.7
    landed(w, 'water', 0.5)
    stepPourParticles(
      w,
      { ...st, substrates: { ...st.substrates, water: 0.9 } },
      1000 / 60,
      () => 0.5,
    )
    expect(w.pendingSubstrates.water).toBeCloseTo(0.14, 6)
    expect(w.pendingWaterSplit).toBeUndefined()
    expect(w.env.cycleProgress).toBe(0)
  })
  it('gravel landing left of the divider raises rivergravel by 0.06 up to 30', () => {
    const w = createWorld()
    landed(w, 'rivergravel', 0.2)
    stepPourParticles(w, st, 1000 / 60, () => 0.5)
    expect(w.pendingSubstrates.rivergravel).toBeCloseTo(0.06, 6)
    const p = createWorld()
    landed(p, 'pebbles', 0.2)
    stepPourParticles(p, st, 1000 / 60, () => 0.5)
    expect(p.pendingSubstrates.rivergravel).toBeCloseTo(0.06, 6)
    expect(p.pendingSubstrates.pebbles).toBeUndefined()
    const capped = createWorld()
    landed(capped, 'rivergravel', 0.2)
    stepPourParticles(
      capped,
      { ...st, substrates: { ...st.substrates, rivergravel: 30 } },
      1000 / 60,
      () => 0.5,
    )
    expect(capped.pendingSubstrates.rivergravel ?? 0).toBe(0)
  })
  it('land landing raises its layer by 0.08 up to 60 and bumps the contour', () => {
    const w = createWorld()
    landed(w, 'soil', 0.5)
    stepPourParticles(w, st, 1000 / 60, () => 0.5)
    expect(w.pendingSubstrates.soil).toBeCloseTo(0.08, 6)
    expect(w.terrainContour[10]).toBeCloseTo(0.22, 6)
    expect(w.terrainContour[9]).toBeCloseTo(0.11, 6)
    expect(w.surfaceGrains).toHaveLength(1)
    w.terrainContour[10] = MAX_CONTOUR_MM
    landed(w, 'soil', 0.5)
    stepPourParticles(w, st, 1000 / 60, () => 0.5)
    expect(w.terrainContour[10]).toBe(18)
    const capped = createWorld()
    landed(capped, 'soil', 0.5)
    stepPourParticles(
      capped,
      { ...st, substrates: { ...st.substrates, soil: 60 } },
      1000 / 60,
      () => 0.5,
    )
    expect(capped.pendingSubstrates.soil ?? 0).toBe(0)
  })
  it('siphon drains water first, then the top land layer', () => {
    const w = createWorld()
    w.surfaceGrains = [{ x: 0.5, y: 0.5 } as WorldEntity]
    siphonStep(w, { substrates: { ...st.substrates, water: 10 } })
    expect(w.pendingSubstrates.water).toBeCloseTo(-0.35, 6)
    expect(w.pendingSubstrates.leaflitter).toBeUndefined()
    expect(w.surfaceGrains).toHaveLength(1)
    const dry = createWorld()
    dry.surfaceGrains = [{ x: 0.5, y: 0.5 } as WorldEntity]
    siphonStep(dry, { substrates: { ...st.substrates, water: 0 } })
    expect(dry.pendingSubstrates.leaflitter).toBeCloseTo(-0.25, 6)
    expect(dry.surfaceGrains).toHaveLength(0)
    const noLitter = createWorld()
    siphonStep(noLitter, { substrates: { ...st.substrates, water: 0, leaflitter: 0, sand: 0 } })
    expect(noLitter.pendingSubstrates.soil).toBeCloseTo(-0.25, 6)
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
