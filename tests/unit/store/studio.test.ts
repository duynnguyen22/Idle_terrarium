import { createStore } from 'jotai'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AwayReport } from '@/engine/simulation/report'
import {
  backdropAtom,
  backdropHazeAtom,
  bindStudioStorage,
  catchupEnabledAtom,
  cycleProgressAtom,
  dayCountAtom,
  envSeedAtom,
  hardwareAtoms,
  lastSimulatedAtAtom,
  mineralSpotsAtom,
  musicVolumeAtom,
  paceAtom,
  partialize,
  pumpFlowAtom,
  pushAwayReportAtom,
  resetStudioAtom,
  roomAtom,
  selectedIdAtom,
  setSubstrateAtom,
  setupDayAtom,
  STUDIO_STORAGE_KEY,
  studioStateAtom,
  substratesAtom,
  toggleHardwareAtom,
  waterSplitAtom,
} from '@/store/studio'

function awayReport(from: number, to: number): AwayReport {
  return {
    from,
    to,
    hours: 1,
    tankHours: 1,
    capped: false,
    mode: 'away',
    reason: '',
    items: [],
    more: 0,
    rest: [],
    hints: [],
  }
}

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

let memoryStorage: Storage

beforeEach(() => {
  memoryStorage = makeMemoryStorage()
})

/** A fresh jotai store bound to `storage` (the old `createStudioStore(storage)`). */
function createStudio(storage: Storage = memoryStorage) {
  const store = createStore()
  bindStudioStorage(store, storage)
  return store
}

const stateOf = (store: ReturnType<typeof createStore>) => store.get(studioStateAtom)
const storedSave = (storage: Storage = memoryStorage) =>
  JSON.parse(storage.getItem(STUDIO_STORAGE_KEY) ?? '{}')

describe('studio store', () => {
  it('defaults equal the prototype defaults', () => {
    const s = stateOf(createStudio())
    expect(s).toMatchObject({
      vessel: 'paludarium_tank',
      hasLid: true,
      hasGrowLamp: true,
      hasFogger: true,
      lighting: 'sunlight',
      autoLightSync: true,
      timeSpeed: 1,
      realTimeMode: true,
      dayCount: 1,
      activeTab: 'vessel',
      activeTool: 'select',
      plantingStage: 'mature',
      soundPreset: 'stream',
      substrates: {
        pebbles: 12,
        charcoal: 5,
        soil: 34,
        sand: 0,
        leaflitter: 5,
        rivergravel: 6,
        water: 45,
      },
    })
    expect(s).toMatchObject({ pumpFlow: 'gentle', waterSplit: 0.32, cycleProgress: 1, setupDay: 1 })
    expect(s).not.toHaveProperty('telemetry')
    expect(s.envSeed).toEqual({ humidity: 82, temperature: 24.5, soilMoisture: 74, nutrients: 88 })
  })

  it('partialize excludes transient fields', () => {
    const p = partialize(stateOf(createStudio()))
    for (const k of ['selectedId', 'activeTool', 'relaxMode', 'telemetry', 'activePourMaterial']) {
      expect(p).not.toHaveProperty(k)
    }
    expect(p).toHaveProperty('worldSnapshot')
    expect(p).toHaveProperty('substrates')
    expect(p).toHaveProperty('envSeed')
  })

  it('musicVolumeAtom clamps, ignores non-finite values, and persists', () => {
    const store = createStudio()
    expect(store.get(musicVolumeAtom)).toBe(0.5)
    store.set(musicVolumeAtom, 2)
    expect(store.get(musicVolumeAtom)).toBe(1)
    store.set(musicVolumeAtom, Number.NaN)
    expect(store.get(musicVolumeAtom)).toBe(1)
    store.set(musicVolumeAtom, 0.3)
    expect(storedSave().state.musicVolume).toBe(0.3)
  })

  it('hydration sanitizes a bad musicVolume and an unknown soundPreset', () => {
    memoryStorage.setItem(
      STUDIO_STORAGE_KEY,
      JSON.stringify({ state: { musicVolume: 'loud', soundPreset: 'polka' }, version: 4 }),
    )
    const s = stateOf(createStudio())
    expect(s.musicVolume).toBe(0.5)
    expect(s.soundPreset).toBe('stream')
  })

  it('actions update state and persist non-transient fields', () => {
    const store = createStudio()
    store.set(toggleHardwareAtom, 'hasLid')
    store.set(setSubstrateAtom, 'sand', 5)
    store.set(dayCountAtom, 2)
    store.set(selectedIdAtom, 'x')
    expect(stateOf(store)).toMatchObject({ hasLid: false, dayCount: 2, selectedId: 'x' })
    expect(stateOf(store).substrates.sand).toBe(5)
    const stored = storedSave()
    expect(stored.version).toBe(4)
    expect(stored.state.dayCount).toBe(2)
    expect(stored.state).not.toHaveProperty('selectedId')
    store.set(resetStudioAtom)
    expect(store.get(dayCountAtom)).toBe(1)
  })

  it('imports a prototype save when the new key is absent', () => {
    memoryStorage.setItem(
      'existence_botanica_paludarium_v5',
      JSON.stringify({
        vessel: 'paludarium_tank',
        hasLid: false,
        substrates: { sand: 9 },
        items: [{ uid: 'a', id: 'fern', category: 'flora' }],
        dayCount: 4,
      }),
    )
    const s = stateOf(createStudio())
    expect(s.hasLid).toBe(false)
    expect(s.dayCount).toBe(4)
    expect(s.worldSnapshot?.items).toHaveLength(1)
    expect(memoryStorage.getItem('existence_botanica_paludarium_v5')).not.toBeNull()
  })

  it('does not import when the new key already exists', () => {
    memoryStorage.setItem(
      'existence_botanica_paludarium_v5',
      JSON.stringify({ items: [{ uid: 'a' }], dayCount: 9 }),
    )
    memoryStorage.setItem(
      STUDIO_STORAGE_KEY,
      JSON.stringify({ state: { dayCount: 2 }, version: 1 }),
    )
    expect(createStudio().get(dayCountAtom)).toBe(2)
  })

  it('unchanged substrates/envSeed writes notify nobody and write no storage', () => {
    const store = createStudio()
    const setItem = vi.spyOn(memoryStorage, 'setItem')
    const listener = vi.fn()
    store.sub(studioStateAtom, listener)
    setItem.mockClear()
    const { substrates, envSeed } = stateOf(store)
    for (let i = 0; i < 10; i++) {
      store.set(substratesAtom, { ...substrates })
      // Differences below the 1-decimal rounding are not a change.
      store.set(envSeedAtom, { ...envSeed, humidity: envSeed.humidity + 0.01 })
    }
    expect(listener).not.toHaveBeenCalled()
    expect(setItem).not.toHaveBeenCalled()
    setItem.mockRestore()
  })

  it('envSeedAtom rounds to 1 decimal and persists', () => {
    const store = createStudio()
    store.set(envSeedAtom, {
      humidity: 61.26,
      temperature: 22.04,
      soilMoisture: 50,
      nutrients: 30.449,
    })
    expect(store.get(envSeedAtom)).toEqual({
      humidity: 61.3,
      temperature: 22,
      soilMoisture: 50,
      nutrients: 30.4,
    })
    expect(storedSave().state.envSeed).toEqual({
      humidity: 61.3,
      temperature: 22,
      soilMoisture: 50,
      nutrients: 30.4,
    })
  })

  it('envSeed survives a rehydrate from the serialised storage', () => {
    const store = createStudio()
    store.set(envSeedAtom, { ...store.get(envSeedAtom), nutrients: 30 })
    const serialised = memoryStorage.getItem(STUDIO_STORAGE_KEY)
    expect(serialised).not.toBeNull()
    const fresh = makeMemoryStorage()
    fresh.setItem(STUDIO_STORAGE_KEY, serialised!)
    const reloaded = createStudio(fresh)
    expect(reloaded.get(envSeedAtom).nutrients).toBe(30)
    expect(reloaded.get(envSeedAtom).humidity).toBe(82)
  })

  it('a v2 save without envSeed hydrates the default seed', () => {
    memoryStorage.setItem(
      STUDIO_STORAGE_KEY,
      JSON.stringify({ state: { dayCount: 5, waterSplit: 0.2 }, version: 2 }),
    )
    const s = stateOf(createStudio())
    expect(s.dayCount).toBe(5)
    expect(s.envSeed).toEqual({ humidity: 82, temperature: 24.5, soilMoisture: 74, nutrients: 88 })
  })

  it('waterSplitAtom clamps to [0, 0.6] and persists pool fields', () => {
    const store = createStudio()
    store.set(waterSplitAtom, 0.9)
    expect(store.get(waterSplitAtom)).toBe(0.6)
    store.set(pumpFlowAtom, 'strong')
    store.set(cycleProgressAtom, 0.4)
    expect(partialize(stateOf(store))).toMatchObject({
      waterSplit: 0.6,
      pumpFlow: 'strong',
      cycleProgress: 0.4,
    })
    store.set(waterSplitAtom, -1)
    expect(store.get(waterSplitAtom)).toBe(0)
  })

  it('cycleProgressAtom clamps to [0, 1]; setupDay and hardware atoms set values', () => {
    const store = createStudio()
    store.set(cycleProgressAtom, 3)
    expect(store.get(cycleProgressAtom)).toBe(1)
    store.set(cycleProgressAtom, -0.5)
    expect(store.get(cycleProgressAtom)).toBe(0)
    store.set(setupDayAtom, 9)
    store.set(hardwareAtoms.hasFogger, false)
    store.set(hardwareAtoms.hasLid, true)
    expect(stateOf(store)).toMatchObject({ setupDay: 9, hasFogger: false, hasLid: true })
    expect(storedSave().state).toMatchObject({ setupDay: 9, cycleProgress: 0, hasFogger: false })
  })

  it('hydrates a persisted v1 save through the v1 to v2 migration and writes it back', () => {
    memoryStorage.setItem(
      STUDIO_STORAGE_KEY,
      JSON.stringify({
        state: {
          dayCount: 7,
          substrates: {
            pebbles: 10,
            lavarock: 8,
            charcoal: 6,
            moss: 8,
            soil: 16,
            rivergravel: 16,
            sand: 0,
            water: 24,
          },
        },
        version: 1,
      }),
    )
    const s = stateOf(createStudio())
    const migrated = {
      pebbles: 18,
      charcoal: 6,
      soil: 24,
      sand: 0,
      leaflitter: 0,
      rivergravel: 16,
      water: 24,
    }
    expect(s.substrates).toEqual(migrated)
    expect(s).toMatchObject({
      dayCount: 7,
      setupDay: 1,
      pumpFlow: 'gentle',
      waterSplit: 0.32,
      cycleProgress: 1,
    })
    expect(s.substrates).not.toHaveProperty('lavarock')
    // Like the persist middleware, a migrated save is written back at once at the current version.
    const stored = storedSave()
    expect(stored.version).toBe(4)
    expect(stored.state).toMatchObject({ dayCount: 7, substrates: migrated })
  })

  it('defaults the room, backdrop, haze and mineral spots', () => {
    expect(stateOf(createStudio())).toMatchObject({
      room: { water: 'tap_treated', tds: 180, ph: 7.2, air: 'clean', purifier: false },
      backdrop: 'none',
      backdropHaze: 35,
      mineralSpots: 0,
    })
  })

  it('roomAtom clamps tds to 20–600 and ph to 5.5–8.5 and merges the patch', () => {
    const store = createStudio()
    store.set(roomAtom, { tds: 5, ph: 9 })
    expect(store.get(roomAtom)).toMatchObject({ water: 'tap_treated', tds: 20, ph: 8.5 })
    store.set(roomAtom, { tds: 5000, ph: 1, purifier: true })
    expect(store.get(roomAtom)).toMatchObject({ tds: 600, ph: 5.5, purifier: true })
  })

  it('backdropHazeAtom clamps to 0–80 and persists', () => {
    const store = createStudio()
    store.set(backdropHazeAtom, 95)
    expect(store.get(backdropHazeAtom)).toBe(80)
    expect(partialize(stateOf(store)).backdropHaze).toBe(80)
    store.set(backdropHazeAtom, -4)
    expect(store.get(backdropHazeAtom)).toBe(0)
  })

  it('persists room, backdrop and mineral spots at version 4', () => {
    const store = createStudio()
    store.set(roomAtom, { water: 'rain', air: 'smoke' })
    store.set(backdropAtom, 'karst')
    store.set(mineralSpotsAtom, 0.5)
    const stored = storedSave()
    expect(stored.version).toBe(4)
    expect(stored.state).toMatchObject({
      room: { water: 'rain', air: 'smoke' },
      backdrop: 'karst',
      mineralSpots: 0.5,
    })
  })

  it('hydrates a v2 save with the v3 defaults', () => {
    memoryStorage.setItem(
      STUDIO_STORAGE_KEY,
      JSON.stringify({ state: { dayCount: 5 }, version: 2 }),
    )
    expect(stateOf(createStudio())).toMatchObject({
      dayCount: 5,
      room: { water: 'tap_treated' },
      backdrop: 'none',
    })
  })

  it('sanitizes a hand-edited v3 save on hydration', () => {
    memoryStorage.setItem(
      STUDIO_STORAGE_KEY,
      JSON.stringify({
        state: {
          room: { water: 'lava', tds: 9000, ph: 2, air: 'clean', purifier: false },
          backdropHaze: 500,
        },
        version: 3,
      }),
    )
    expect(stateOf(createStudio())).toMatchObject({
      room: { water: 'tap_treated', tds: 600, ph: 5.5 },
      backdropHaze: 80,
    })
  })

  it('hydrates a v3 save with the v4 defaults', () => {
    memoryStorage.setItem(
      STUDIO_STORAGE_KEY,
      JSON.stringify({ state: { dayCount: 5 }, version: 3 }),
    )
    const s = stateOf(createStudio())
    expect(s).toMatchObject({
      dayCount: 5,
      pace: 'garden',
      lastSimulatedAt: null,
      catchupEnabled: true,
      awayLog: [],
    })
    expect(s.worldSeed).toHaveLength(8)
  })

  it('sanitizes a bad pace and awayLog on a current-version hydration', () => {
    memoryStorage.setItem(
      STUDIO_STORAGE_KEY,
      JSON.stringify({ state: { pace: 'warp', awayLog: 'nope' }, version: 4 }),
    )
    expect(stateOf(createStudio())).toMatchObject({
      pace: 'garden',
      awayLog: [],
    })
  })

  it('pushAwayReportAtom keeps the newest 12 reports, newest first', () => {
    const store = createStudio()
    for (let i = 0; i < 15; i++) store.set(pushAwayReportAtom, awayReport(i, i + 1))
    const log = stateOf(store).awayLog
    expect(log).toHaveLength(12)
    expect(log[0]).toEqual(awayReport(14, 15))
    expect(log[11]).toEqual(awayReport(3, 4))
  })

  it('persists pace, lastSimulatedAt, catchupEnabled, worldSeed and awayLog', () => {
    const store = createStudio()
    store.set(paceAtom, 'calm')
    store.set(lastSimulatedAtAtom, 1234)
    store.set(catchupEnabledAtom, false)
    store.set(pushAwayReportAtom, awayReport(1, 2))
    expect(storedSave().state).toMatchObject({
      pace: 'calm',
      lastSimulatedAt: 1234,
      catchupEnabled: false,
      worldSeed: stateOf(store).worldSeed,
      awayLog: [awayReport(1, 2)],
    })
    expect(partialize(stateOf(store)).worldSeed).toHaveLength(8)
  })

  it('dayCountAtom sets the day count', () => {
    const store = createStudio()
    store.set(dayCountAtom, 42)
    expect(store.get(dayCountAtom)).toBe(42)
  })

  it('defaults to the garden pace with catch-up on and a fresh seed', () => {
    const s = stateOf(createStudio())
    expect(s).toMatchObject({
      pace: 'garden',
      lastSimulatedAt: null,
      catchupEnabled: true,
      awayLog: [],
    })
    expect(s.worldSeed).toHaveLength(8)
  })

  it('ignores non-finite haze and mineral spots and clamps spots to 0–1', () => {
    const store = createStudio()
    store.set(backdropHazeAtom, Number.NaN)
    store.set(mineralSpotsAtom, Number.NaN)
    expect(stateOf(store)).toMatchObject({ backdropHaze: 35, mineralSpots: 0 })
    store.set(mineralSpotsAtom, 3)
    expect(store.get(mineralSpotsAtom)).toBe(1)
    store.set(mineralSpotsAtom, -1)
    expect(store.get(mineralSpotsAtom)).toBe(0)
  })
})
