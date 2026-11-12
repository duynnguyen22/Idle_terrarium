import { createStore, type Store } from 'jotai'
import { beforeEach, describe, expect, it } from 'vitest'
import { registerWorld, unregisterWorld } from '@/engine/engineBridge'
import { applyPreset, seedInitialScene } from '@/engine/presets'
import {
  getLandSurfaceNormY,
  getPoolBedNormY,
  getSoilSurfaceNormalizedY,
  getWaterTopNormY,
} from '@/engine/geometry'
import { createWorld, type EngineWorld } from '@/engine/world'
import { appStore } from '@/store/appStore'
import {
  bindStudioStorage,
  createDefaultState,
  patchStudioAtom,
  studioStateAtom,
  worldSnapshotAtom,
} from '@/store/studio'

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

beforeEach(() => {
  unregisterWorld()
  appStore.set(patchStudioAtom, createDefaultState())
})

describe('seedInitialScene', () => {
  it('seeds Falls Lake and commits when the world has no items (no snapshot / zero-item snapshot)', () => {
    const world = createWorld()
    registerWorld(world)
    expect(seedInitialScene(world)).toBe(true)
    expect(world.items).toHaveLength(17)
    expect(appStore.get(worldSnapshotAtom)?.items).toHaveLength(17)
  })

  it('leaves a populated world untouched', () => {
    const world = createWorld()
    registerWorld(world)
    seedInitialScene(world)
    const snap = appStore.get(worldSnapshotAtom)
    expect(seedInitialScene(world)).toBe(false)
    expect(appStore.get(worldSnapshotAtom)).toBe(snap)
  })
})

describe('applyPreset', () => {
  let w: EngineWorld
  let store: Store

  beforeEach(() => {
    w = createWorld()
    store = createStore()
    bindStudioStorage(store, makeMemoryStorage())
  })

  it('falls preset builds the v6 scene', () => {
    const toast = applyPreset(w, 'falls', store)
    expect(toast).toBe('Falls Lake: 30% pool, waterfall and moss wall')
    expect(store.get(studioStateAtom)).toMatchObject({
      vessel: 'paludarium_tank',
      pumpFlow: 'gentle',
      waterSplit: 0.32,
      cycleProgress: 1,
      hasLid: true,
      hasGrowLamp: true,
      hasFogger: true,
    })
    expect(w.items).toHaveLength(17)
    expect(
      w.items
        .filter((i) => i.category === 'flora')
        .every((i) => i.stage === 'mature' && i.growthProgress === 0.85 && i.vitality === 98),
    ).toBe(true)
    expect(w.terrainContour[15]).toBeCloseTo(Math.max(0, Math.sin(15 * 0.45) * 2.5 + 1.8), 5)
    expect(w.env.bloomTimer).toBe(700)
    const frogbit = w.items.find((i) => i.id === 'frogbit_pads')!
    expect(frogbit.y).toBeCloseTo(
      getWaterTopNormY({
        substrates: store.get(studioStateAtom).substrates,
        waterSplit: 0.32,
        terrainContour: w.terrainContour,
      }),
      5,
    )
  })

  it('falls resets the build clock, env cycle and per-scene transients', () => {
    store.set(patchStudioAtom, {
      dayCount: 9,
      setupDay: 1,
      cycleProgress: 0.2,
      waterSplit: 0,
      hasLid: false,
    })
    w.env.cycleProgress = 0.2
    w.moldPatches.push({ x: 0.5, size: 10 })
    w.surfaceGrains.push({ x: 0.5 })
    w.pendingSubstrates = { soil: 3 }
    w.pendingWaterSplit = 0.1
    w.mossTufts.push({ x: 0.4, r: 3, w: 1, seed: 1 })
    w.breed = { springtails: 0.4 }
    applyPreset(w, 'falls', store)
    expect(w.mossTufts).toHaveLength(0)
    expect(w.breed).toEqual({})
    expect(store.get(studioStateAtom).setupDay).toBe(9)
    expect(w.env.cycleProgress).toBe(1)
    expect(w.moldPatches).toHaveLength(0)
    expect(w.surfaceGrains).toHaveLength(0)
    expect(w.pendingSubstrates).toEqual({})
    expect(w.pendingWaterSplit).toBeUndefined()
  })

  it('falls places items by the prototype anchors', () => {
    applyPreset(w, 'falls', store)
    const t = {
      substrates: store.get(studioStateAtom).substrates,
      waterSplit: 0.32,
      terrainContour: w.terrainContour,
    }
    const sY = getLandSurfaceNormY(t, 0.6)
    const byId = (id: string) => w.items.filter((i) => i.id === id)
    expect(byId('moss_wall_cliff')[0].y).toBeCloseTo(sY - 0.25, 6)
    expect(byId('golden_river_boulders')[0].y).toBeCloseTo(sY - 0.03, 6)
    expect(byId('root_slate_waterfall')[0].isWaterfall).toBe(true)
    expect(byId('pogostemon_star')[0].y).toBeCloseTo(sY - 0.035, 6)
    expect(byId('subwassertang')[0].y).toBeCloseTo(getPoolBedNormY(t.substrates) - 0.03, 6)
    for (const f of w.items.filter((i) => i.category === 'fauna')) {
      expect(f.y).toBeCloseTo(getSoilSurfaceNormalizedY(t, f.x) - 0.03, 6)
      expect(f).toMatchObject({ vx: 0.0003, vy: 0, aiState: 'wandering', aiTimer: 120 })
    }
    const moss = byId('moss_wall_cliff')[0]
    expect(byId('cryptanthus_pink')[0]).toMatchObject({
      parentUid: moss.uid,
      offsetX: 0.12,
      offsetY: -0.17,
    })
  })

  it('desert recipe clears the pool and the fogger', () => {
    applyPreset(w, 'falls', store)
    w.surfaceGrains.push({ x: 0.5 })
    expect(applyPreset(w, 'desert', store)).toBe('Arid: open top, sand, no fogger')
    expect(store.get(studioStateAtom).waterSplit).toBe(0)
    expect(store.get(studioStateAtom).hasFogger).toBe(false)
    expect(store.get(studioStateAtom).hasLid).toBe(false)
    expect(w.surfaceGrains).toHaveLength(0)
    expect(w.terrainContour.every((v) => v === 0)).toBe(true)
    expect(w.items).toHaveLength(17)
  })

  it('lagoon recipe sets the pool and a cycled env without touching the bloom timer', () => {
    w.env.cycleProgress = 0
    w.env.bloomTimer = 0
    expect(applyPreset(w, 'paludarium', store)).toBe('Lagoon: 45% pool for fish and shrimp')
    expect(store.get(studioStateAtom)).toMatchObject({
      waterSplit: 0.45,
      cycleProgress: 1,
      hasLid: true,
    })
    expect(w.env.cycleProgress).toBe(1)
    expect(w.env.bloomTimer).toBe(0)
  })
})
