import { createStore, type Store } from 'jotai'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
import { slowStep } from '@/engine/simulation/dayTick'
import { addSporePatch, updateMold } from '@/engine/simulation/mold'
import { eventText } from '@/engine/simulation/report'
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
import {
  flushTelemetry,
  pushTelemetry,
  SNAPSHOT_INTERVAL_MS,
  TELEMETRY_INTERVAL_MS,
} from '@/engine/simulation/telemetry'
import { syncChildren, tick } from '@/engine/simulation/tick'
import { createWorld, type EngineWorld, type WorldEntity } from '@/engine/world'
import {
  activePourMaterialAtom,
  activeToolAtom,
  autoLightSyncAtom,
  bindStudioStorage,
  cycleProgressAtom,
  dayCountAtom,
  envSeedAtom,
  lightingAtom,
  studioStateAtom,
  timeSpeedAtom,
} from '@/store/studio'
import { telemetryAtom } from '@/store/telemetry'

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

let store: Store
beforeEach(() => {
  localStorage.clear()
  // A fresh store per test: studio atoms bound to localStorage, telemetry at its defaults.
  store = createStore()
  bindStudioStorage(store, localStorage)
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
    store.set(lightingAtom, 'night')
    expect(advanceClock(store, noon)).toBe(true)
    expect(store.get(studioStateAtom).lighting).toBe('sunlight')
    expect(advanceClock(store, noon)).toBe(false)
    store.set(autoLightSyncAtom, false)
    store.set(lightingAtom, 'night')
    expect(advanceClock(store, noon)).toBe(false)
    expect(store.get(studioStateAtom).lighting).toBe('night')
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
    updateFauna(world, store.get(studioStateAtom), FRAME_MS, 0, mulberry32(1))
    expect(world.items[0].x).toBe(0.5)
    expect(world.items[0].aiTimer).toBe(5)
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
    // The crew clears patches per tank day (slowStep), not per frame.
    addItem(w, 'springtails', 'mature', { terrain })
    addItem(w, 'isopod', 'mature', { terrain })
    const sizes = w.moldPatches.map((p) => p.size)
    updateMold(w, st, 1000 / 60, () => 0.5)
    expect(w.moldPatches.map((p) => p.size)).toEqual(sizes)
    slowStep(
      w,
      0.05,
      { ...st, pace: 'garden', hasGrowLamp: true, pumpFlow: 'gentle' },
      { away: false },
    )
    expect(w.moldPatches).toHaveLength(3 - 2) // 27 * 2 * 0.05 = 2.7 patches
    slowStep(
      w,
      0.05,
      { ...st, pace: 'garden', hasGrowLamp: true, pumpFlow: 'gentle' },
      { away: false },
    )
    expect(w.moldPatches).toHaveLength(0)
  })
  it('+Spore places a patch on land', () => {
    const world = createWorld()
    world.env.bloomTimer = 0
    addSporePatch(world, st, () => 0)
    expect(world.moldPatches[0]).toEqual({ x: getDividerNormX(0.32) + 0.03, size: 11 })
    updateMold(world, st, FRAME_MS, () => 0.5)
    expect(world.moldPatches[0].size).toBe(11)
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
    const before = store.get(studioStateAtom).substrates.soil
    for (let i = 0; i < 100; i++) spawnPourStream(world, 'soil', rng)
    expect(world.fallingStreams.length).toBe(200)
    for (let i = 0; i < 600 && world.fallingStreams.length; i++)
      stepPourParticles(world, store.get(studioStateAtom), FRAME_MS, rng)
    expect(world.fallingStreams.length).toBe(0)
    expect(world.surfaceGrains.length).toBe(200)
    expect(world.terrainContour[10]).toBeGreaterThan(0)
    expect(world.terrainContour[10]).toBe(Math.max(...world.terrainContour))
    expect(Math.max(...world.terrainContour)).toBeLessThanOrEqual(18)
    pushTelemetry(world, store, 1000)
    expect(store.get(studioStateAtom).substrates.soil).toBeGreaterThan(before)
    expect(store.get(studioStateAtom).substrates.soil).toBeLessThanOrEqual(60)
  })
  it('water landings raise water and the mist boost (capped at 20)', () => {
    const rng = mulberry32(2)
    const world = createWorld()
    for (let i = 0; i < 40; i++) spawnPourStream(world, 'water', rng)
    for (let i = 0; i < 600; i++)
      stepPourParticles(world, store.get(studioStateAtom), FRAME_MS, rng)
    pushTelemetry(world, store, 1000)
    expect(store.get(studioStateAtom).substrates.water).toBeGreaterThan(24)
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
      stepPourParticles(world, store.get(studioStateAtom), FRAME_MS, rng)
    expect(world.pourSettled).toBe(false) // still pouring
    spawnPourStream(world, 'soil', rng)
    world.isPouring = false
    stepPourParticles(world, store.get(studioStateAtom), FRAME_MS, rng)
    expect(world.pourSettled).toBe(false) // in flight
    for (let i = 0; i < 600 && world.fallingStreams.length; i++)
      stepPourParticles(world, store.get(studioStateAtom), FRAME_MS, rng)
    expect(world.pourSettled).toBe(true)
  })
  it('caps surface grains at 220', () => {
    const rng = mulberry32(5)
    const world = createWorld()
    for (let i = 0; i < 150; i++) spawnPourStream(world, 'sand', rng)
    for (let i = 0; i < 600; i++)
      stepPourParticles(world, store.get(studioStateAtom), FRAME_MS, rng)
    expect(world.surfaceGrains.length).toBe(220)
  })
  it('siphonStep never drops anything below 0', () => {
    const world = createWorld()
    for (let i = 0; i < 3000; i++) siphonStep(world, store.get(studioStateAtom))
    pushTelemetry(world, store, 1000)
    const s = store.get(studioStateAtom).substrates
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
  const telemetry = () => store.get(telemetryAtom)
  it('writes at most 4x per simulated second and skips unchanged values', () => {
    const world = createWorld()
    world.moldPatches.push({ x: 0.3, size: 12 })
    let writes = 0
    const unsub = store.sub(telemetryAtom, () => writes++)
    let studioWrites = 0
    const unsubStudio = store.sub(studioStateAtom, () => studioWrites++)
    let flushes = 0
    for (let t = 1000; t < 2000; t += FRAME_MS) if (pushTelemetry(world, store, t)) flushes++
    unsub()
    unsubStudio()
    expect(flushes).toBeLessThanOrEqual(1000 / TELEMETRY_INTERVAL_MS)
    expect(flushes).toBeGreaterThanOrEqual(3)
    expect(writes).toBe(1) // moldCount changed once; later flushes are no-ops
    expect(studioWrites).toBe(0)
    expect(telemetry().moldCount).toBe(1)
    expect(telemetry().cleanupCrewCount).toBe(0)
  })
  it('pushTelemetry flushes env, cycle progress and pending water split', () => {
    const w = createWorld()
    w.env.temperature = 30
    w.env.cycleProgress = 0.3
    w.pendingWaterSplit = 0.3
    pushTelemetry(w, store, 1000)
    expect(telemetry().temperature).toBe(30)
    expect(store.get(studioStateAtom).cycleProgress).toBe(0.3)
    expect(store.get(studioStateAtom).waterSplit).toBe(0.3)
    expect(w.pendingWaterSplit).toBeUndefined()
  })
  it('50 flushes of moving gauges write no storage when no persisted field changed', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    const w = createWorld()
    w.env.cycleProgress = 100.5 / 210 // mid-bucket, so the drift below never crosses a 1/210 step
    store.set(cycleProgressAtom, Math.floor(w.env.cycleProgress * 210) / 210)
    setItem.mockClear()
    let t = 1000
    w.lastEnvSeedPush = t
    for (let i = 0; i < 50; i++) {
      // Float drift on every gauge; the env seed's 1-decimal rounding hides all of it.
      w.env.humidity = 82 + i * 0.0007
      w.env.temperature = 24.5 - i * 0.0009
      w.env.soilMoisture = 74 + Math.sin(i) * 0.03
      w.env.nutrients = 88 - i * 0.0004
      w.env.o2 = 96 - i * 0.37
      w.env.condensation = (i % 7) / 10
      w.env.cycleProgress += 0.00001
      t += TELEMETRY_INTERVAL_MS
      expect(pushTelemetry(w, store, t)).toBe(true)
    }
    expect(telemetry().o2Balance).toBeCloseTo(96 - 49 * 0.37, 6)
    expect(setItem).not.toHaveBeenCalled()
    setItem.mockRestore()
  })
  it('quantises cycle progress to 1/210 before writing it', () => {
    const w = createWorld()
    w.env.cycleProgress = 0.31
    pushTelemetry(w, store, 1000)
    expect(store.get(studioStateAtom).cycleProgress).toBe(Math.floor(0.31 * 210) / 210)
    let writes = 0
    const unsub = store.sub(studioStateAtom, () => writes++)
    w.env.cycleProgress = 0.3101
    pushTelemetry(w, store, 2000)
    expect(writes).toBe(0)
    w.env.cycleProgress = 0.32
    pushTelemetry(w, store, 3000)
    unsub()
    expect(writes).toBe(1)
    expect(store.get(studioStateAtom).cycleProgress).toBe(Math.floor(0.32 * 210) / 210)
  })
  it('flushTelemetry sets dayCount to floor(ecoTime)+1 once', () => {
    const w = createWorld()
    let writes = 0
    // sub only fires when dayCount actually changes.
    const unsub = store.sub(dayCountAtom, () => writes++)
    w.ecoTime = 2.4
    flushTelemetry(w, store)
    flushTelemetry(w, store)
    expect(store.get(studioStateAtom).dayCount).toBe(3)
    expect(writes).toBe(1)
    w.ecoTime = 2.99
    flushTelemetry(w, store)
    expect(writes).toBe(1)
    w.ecoTime = 3
    flushTelemetry(w, store)
    unsub()
    expect(store.get(studioStateAtom).dayCount).toBe(4)
    expect(writes).toBe(2)
  })
  it('pushTelemetry commits a snapshot and lastSimulatedAt once per minute', () => {
    const w = createWorld()
    const commit = vi.fn()
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
    pushTelemetry(w, store, 1000, undefined, commit)
    expect(commit).not.toHaveBeenCalled()
    expect(store.get(studioStateAtom).lastSimulatedAt).toBeNull()
    let t = 1000
    while (t < SNAPSHOT_INTERVAL_MS) pushTelemetry(w, store, (t += 250), undefined, commit)
    expect(commit).toHaveBeenCalledTimes(1)
    expect(store.get(studioStateAtom).lastSimulatedAt).toBe(1_700_000_000_000)
    expect(w.lastSnapshotCommit).toBe(t)
    for (let i = 0; i < 100; i++) pushTelemetry(w, store, (t += 250), undefined, commit)
    expect(commit).toHaveBeenCalledTimes(1)
    pushTelemetry(w, store, w.lastSnapshotCommit + SNAPSHOT_INTERVAL_MS, undefined, commit)
    expect(commit).toHaveBeenCalledTimes(2)
    vi.restoreAllMocks()
  })
  it('writes the env seed at most once every 5 s, rounded to 1 decimal', () => {
    const w = createWorld()
    let seedWrites = 0
    // sub only fires when the envSeed object is replaced.
    const unsub = store.sub(envSeedAtom, () => seedWrites++)
    w.lastEnvSeedPush = 0
    for (let t = 250; t <= 12_500; t += TELEMETRY_INTERVAL_MS) {
      w.env.nutrients = 88 - t / 1000 // drops 0.25 per flush
      pushTelemetry(w, store, t)
    }
    unsub()
    expect(seedWrites).toBe(2) // at 5 s and 10 s
    expect(store.get(studioStateAtom).envSeed.nutrients).toBe(78)
    expect(w.lastEnvSeedPush).toBe(10_000)
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
    store.set(timeSpeedAtom, 0)
    const rng = mulberry32(9)
    tick(world, FRAME_MS, 1000, { store, rng })
    const y0 = world.ambientMotes[0].y
    tick(world, FRAME_MS, 1016, { store, rng })
    expect(world.items[0].growthProgress).toBe(0.2)
    expect(world.ambientMotes[0].y).toBe(y0)

    store.set(timeSpeedAtom, 1)
    store.set(activeToolAtom, 'pour')
    store.set(activePourMaterialAtom, 'soil')
    world.isPouring = true
    for (let i = 0; i < 120; i++) tick(world, FRAME_MS, 2000 + i * FRAME_MS, { store, rng })
    expect(world.fallingStreams.length + world.surfaceGrains.length).toBeGreaterThan(0)
    expect(world.items[0].growthProgress as number).toBeGreaterThan(0.2)
    expect(world.ambientMotes[0].y).not.toBe(y0)
  })
})

describe('tick living time', () => {
  it('toasts that the pool has cycled when a tank day pushes it past 1', () => {
    const w = createWorld()
    w.env.cycleProgress = 1 - 1e-9
    store.set(timeSpeedAtom, 5)
    const toasts: string[] = []
    tick(w, 250, 1000, {
      store,
      rng: mulberry32(1),
      onToast: (m) => toasts.push(m),
    })
    expect(w.env.cycleProgress).toBe(1)
    expect(toasts).toContain('The pool has cycled. Ammonia and nitrite read 0.')
  })
  it('live-toasts notable life events at most once per 20 s, never grown', () => {
    const w = createWorld()
    const fern = item({
      uid: 'f',
      id: 'trailing_ivy',
      category: 'flora',
      life: { cyc: 0.999, n: 0, tendrils: 0 },
    })
    const sprout = item({
      uid: 's',
      id: 'boston_fern',
      category: 'flora',
      stage: 'sprout',
      born: true,
      growthProgress: 1 - 1e-9,
    })
    w.items.push(fern, sprout)
    store.set(timeSpeedAtom, 5)
    const toasts: string[] = []
    const deps = {
      store,
      rng: mulberry32(1),
      onToast: (m: string) => toasts.push(m),
    }
    // 250 ms at 5x on the garden pace is ~0.0006 of a day; push both items over their thresholds.
    fern.life!.cyc = 1 - 1e-9
    tick(w, 250, 1000, deps)
    expect(toasts).toEqual([eventText('tendril', 'trailing_ivy')])
    fern.life!.cyc = 1 - 1e-9
    tick(w, 250, 5000, deps)
    expect(toasts).toHaveLength(1)
    fern.life!.cyc = 1 - 1e-9
    tick(w, 250, 21_500, deps)
    expect(toasts).toEqual(Array(2).fill(eventText('tendril', 'trailing_ivy')))
    expect(sprout.stage).toBe('mature')
  })
  it('hands the snapshot hook to pushTelemetry', () => {
    const w = createWorld()
    const commit = vi.fn()
    tick(w, 16, SNAPSHOT_INTERVAL_MS + 1000, { store, commit })
    expect(commit).toHaveBeenCalledTimes(1)
  })
})

describe('care report in the tick', () => {
  it('tick refreshes the care report every 30 frames', () => {
    const w = createWorld()
    w.env.humidity = 95
    w.items = [item({ uid: 'tree_frog', id: 'tree_frog', category: 'fauna' })]
    for (let i = 0; i < 30; i++) tick(w, 1000 / 60, i * 16, { store })
    expect(w.careIssues.some((c) => c.text.startsWith('Red-Eyed Tree Frog prefers'))).toBe(true)
  })
})
