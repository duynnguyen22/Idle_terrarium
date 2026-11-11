import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AwayReport } from '@/engine/simulation/report'
import { createStudioStore, partialize, STUDIO_STORAGE_KEY } from '@/store/useStudioStore'

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

beforeEach(() => localStorage.clear())

describe('studio store', () => {
  it('defaults equal the prototype defaults', () => {
    const s = createStudioStore(localStorage).getState()
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
    const p = partialize(createStudioStore(localStorage).getState())
    for (const k of ['selectedId', 'activeTool', 'relaxMode', 'telemetry', 'activePourMaterial']) {
      expect(p).not.toHaveProperty(k)
    }
    expect(p).toHaveProperty('worldSnapshot')
    expect(p).toHaveProperty('substrates')
    expect(p).toHaveProperty('envSeed')
  })

  it('setMusicVolume clamps, ignores non-finite values, and persists', () => {
    const store = createStudioStore(localStorage)
    expect(store.getState().musicVolume).toBe(0.5)
    store.getState().setMusicVolume(2)
    expect(store.getState().musicVolume).toBe(1)
    store.getState().setMusicVolume(Number.NaN)
    expect(store.getState().musicVolume).toBe(1)
    store.getState().setMusicVolume(0.3)
    const stored = JSON.parse(localStorage.getItem(STUDIO_STORAGE_KEY) ?? '{}')
    expect(stored.state.musicVolume).toBe(0.3)
  })

  it('hydration sanitizes a bad musicVolume and an unknown soundPreset', () => {
    localStorage.setItem(
      STUDIO_STORAGE_KEY,
      JSON.stringify({ state: { musicVolume: 'loud', soundPreset: 'polka' }, version: 4 }),
    )
    const s = createStudioStore(localStorage).getState()
    expect(s.musicVolume).toBe(0.5)
    expect(s.soundPreset).toBe('stream')
  })

  it('actions update state and persist non-transient fields', () => {
    const store = createStudioStore(localStorage)
    const a = store.getState()
    a.toggleHardware('hasLid')
    a.setSubstrate('sand', 5)
    a.setDayCount(2)
    a.selectItem('x')
    expect(store.getState()).toMatchObject({ hasLid: false, dayCount: 2, selectedId: 'x' })
    expect(store.getState().substrates.sand).toBe(5)
    const stored = JSON.parse(localStorage.getItem(STUDIO_STORAGE_KEY) ?? '{}')
    expect(stored.version).toBe(4)
    expect(stored.state.dayCount).toBe(2)
    expect(stored.state).not.toHaveProperty('selectedId')
    store.getState().resetStudio()
    expect(store.getState().dayCount).toBe(1)
  })

  it('imports a prototype save when the new key is absent', () => {
    localStorage.setItem(
      'existence_botanica_paludarium_v5',
      JSON.stringify({
        vessel: 'paludarium_tank',
        hasLid: false,
        substrates: { sand: 9 },
        items: [{ uid: 'a', id: 'fern', category: 'flora' }],
        dayCount: 4,
      }),
    )
    const s = createStudioStore(localStorage).getState()
    expect(s.hasLid).toBe(false)
    expect(s.dayCount).toBe(4)
    expect(s.worldSnapshot?.items).toHaveLength(1)
    expect(localStorage.getItem('existence_botanica_paludarium_v5')).not.toBeNull()
  })

  it('does not import when the new key already exists', () => {
    localStorage.setItem(
      'existence_botanica_paludarium_v5',
      JSON.stringify({ items: [{ uid: 'a' }], dayCount: 9 }),
    )
    localStorage.setItem(STUDIO_STORAGE_KEY, JSON.stringify({ state: { dayCount: 2 }, version: 1 }))
    expect(createStudioStore(localStorage).getState().dayCount).toBe(2)
  })

  it('unchanged setSubstrates/setEnvSeed calls notify nobody and write no storage', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    const store = createStudioStore(localStorage)
    const listener = vi.fn()
    store.subscribe(listener)
    setItem.mockClear()
    const { substrates, envSeed } = store.getState()
    for (let i = 0; i < 10; i++) {
      store.getState().setSubstrates({ ...substrates })
      // Differences below the 1-decimal rounding are not a change.
      store.getState().setEnvSeed({ ...envSeed, humidity: envSeed.humidity + 0.01 })
    }
    expect(listener).not.toHaveBeenCalled()
    expect(setItem).not.toHaveBeenCalled()
    setItem.mockRestore()
  })

  it('setEnvSeed rounds to 1 decimal and persists', () => {
    const store = createStudioStore(localStorage)
    store
      .getState()
      .setEnvSeed({ humidity: 61.26, temperature: 22.04, soilMoisture: 50, nutrients: 30.449 })
    expect(store.getState().envSeed).toEqual({
      humidity: 61.3,
      temperature: 22,
      soilMoisture: 50,
      nutrients: 30.4,
    })
    const stored = JSON.parse(localStorage.getItem(STUDIO_STORAGE_KEY) ?? '{}')
    expect(stored.state.envSeed).toEqual({
      humidity: 61.3,
      temperature: 22,
      soilMoisture: 50,
      nutrients: 30.4,
    })
  })

  it('envSeed survives a rehydrate from the serialised storage', () => {
    const store = createStudioStore(localStorage)
    store.getState().setEnvSeed({ ...store.getState().envSeed, nutrients: 30 })
    const serialised = localStorage.getItem(STUDIO_STORAGE_KEY)
    expect(serialised).not.toBeNull()
    localStorage.clear()
    localStorage.setItem(STUDIO_STORAGE_KEY, serialised!)
    const reloaded = createStudioStore(localStorage)
    expect(reloaded.getState().envSeed.nutrients).toBe(30)
    expect(reloaded.getState().envSeed.humidity).toBe(82)
  })

  it('a v2 save without envSeed hydrates the default seed', () => {
    localStorage.setItem(
      STUDIO_STORAGE_KEY,
      JSON.stringify({ state: { dayCount: 5, waterSplit: 0.2 }, version: 2 }),
    )
    const s = createStudioStore(localStorage).getState()
    expect(s.dayCount).toBe(5)
    expect(s.envSeed).toEqual({ humidity: 82, temperature: 24.5, soilMoisture: 74, nutrients: 88 })
  })

  it('setWaterSplit clamps to [0, 0.6] and persists pool fields', () => {
    const store = createStudioStore(localStorage)
    store.getState().setWaterSplit(0.9)
    expect(store.getState().waterSplit).toBe(0.6)
    store.getState().setPumpFlow('strong')
    store.getState().setCycleProgress(0.4)
    expect(partialize(store.getState())).toMatchObject({
      waterSplit: 0.6,
      pumpFlow: 'strong',
      cycleProgress: 0.4,
    })
    store.getState().setWaterSplit(-1)
    expect(store.getState().waterSplit).toBe(0)
  })

  it('setCycleProgress clamps to [0, 1]; setSetupDay and setHardware set values', () => {
    const store = createStudioStore(localStorage)
    store.getState().setCycleProgress(3)
    expect(store.getState().cycleProgress).toBe(1)
    store.getState().setCycleProgress(-0.5)
    expect(store.getState().cycleProgress).toBe(0)
    store.getState().setSetupDay(9)
    store.getState().setHardware('hasFogger', false)
    store.getState().setHardware('hasLid', true)
    expect(store.getState()).toMatchObject({ setupDay: 9, hasFogger: false, hasLid: true })
    const stored = JSON.parse(localStorage.getItem(STUDIO_STORAGE_KEY) ?? '{}')
    expect(stored.state).toMatchObject({ setupDay: 9, cycleProgress: 0, hasFogger: false })
  })

  it('hydrates a persisted v1 save through the v1 to v2 migration', () => {
    localStorage.setItem(
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
    const s = createStudioStore(localStorage).getState()
    expect(s.substrates).toEqual({
      pebbles: 18,
      charcoal: 6,
      soil: 24,
      sand: 0,
      leaflitter: 0,
      rivergravel: 16,
      water: 24,
    })
    expect(s).toMatchObject({
      dayCount: 7,
      setupDay: 1,
      pumpFlow: 'gentle',
      waterSplit: 0.32,
      cycleProgress: 1,
    })
    expect(s.substrates).not.toHaveProperty('lavarock')
  })

  it('defaults the room, backdrop, haze and mineral spots', () => {
    expect(createStudioStore(localStorage).getState()).toMatchObject({
      room: { water: 'tap_treated', tds: 180, ph: 7.2, air: 'clean', purifier: false },
      backdrop: 'none',
      backdropHaze: 35,
      mineralSpots: 0,
    })
  })

  it('setRoom clamps tds to 20–600 and ph to 5.5–8.5 and merges the patch', () => {
    const s = createStudioStore(localStorage)
    s.getState().setRoom({ tds: 5, ph: 9 })
    expect(s.getState().room).toMatchObject({ water: 'tap_treated', tds: 20, ph: 8.5 })
    s.getState().setRoom({ tds: 5000, ph: 1, purifier: true })
    expect(s.getState().room).toMatchObject({ tds: 600, ph: 5.5, purifier: true })
  })

  it('setBackdropHaze clamps to 0–80 and persists', () => {
    const s = createStudioStore(localStorage)
    s.getState().setBackdropHaze(95)
    expect(s.getState().backdropHaze).toBe(80)
    expect(partialize(s.getState()).backdropHaze).toBe(80)
    s.getState().setBackdropHaze(-4)
    expect(s.getState().backdropHaze).toBe(0)
  })

  it('persists room, backdrop and mineral spots at version 4', () => {
    const s = createStudioStore(localStorage)
    s.getState().setRoom({ water: 'rain', air: 'smoke' })
    s.getState().setBackdrop('karst')
    s.getState().setMineralSpots(0.5)
    const stored = JSON.parse(localStorage.getItem(STUDIO_STORAGE_KEY) ?? '{}')
    expect(stored.version).toBe(4)
    expect(stored.state).toMatchObject({
      room: { water: 'rain', air: 'smoke' },
      backdrop: 'karst',
      mineralSpots: 0.5,
    })
  })

  it('hydrates a v2 save with the v3 defaults', () => {
    localStorage.setItem(STUDIO_STORAGE_KEY, JSON.stringify({ state: { dayCount: 5 }, version: 2 }))
    expect(createStudioStore(localStorage).getState()).toMatchObject({
      dayCount: 5,
      room: { water: 'tap_treated' },
      backdrop: 'none',
    })
  })

  it('sanitizes a hand-edited v3 save on hydration', () => {
    localStorage.setItem(
      STUDIO_STORAGE_KEY,
      JSON.stringify({
        state: {
          room: { water: 'lava', tds: 9000, ph: 2, air: 'clean', purifier: false },
          backdropHaze: 500,
        },
        version: 3,
      }),
    )
    expect(createStudioStore(localStorage).getState()).toMatchObject({
      room: { water: 'tap_treated', tds: 600, ph: 5.5 },
      backdropHaze: 80,
    })
  })

  it('hydrates a v3 save with the v4 defaults', () => {
    localStorage.setItem(STUDIO_STORAGE_KEY, JSON.stringify({ state: { dayCount: 5 }, version: 3 }))
    const s = createStudioStore(localStorage).getState()
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
    localStorage.setItem(
      STUDIO_STORAGE_KEY,
      JSON.stringify({ state: { pace: 'warp', awayLog: 'nope' }, version: 4 }),
    )
    expect(createStudioStore(localStorage).getState()).toMatchObject({
      pace: 'garden',
      awayLog: [],
    })
  })

  it('pushAwayReport keeps the newest 12 reports, newest first', () => {
    const s = createStudioStore(localStorage)
    for (let i = 0; i < 15; i++) s.getState().pushAwayReport(awayReport(i, i + 1))
    const log = s.getState().awayLog
    expect(log).toHaveLength(12)
    expect(log[0]).toEqual(awayReport(14, 15))
    expect(log[11]).toEqual(awayReport(3, 4))
  })

  it('persists pace, lastSimulatedAt, catchupEnabled, worldSeed and awayLog', () => {
    const s = createStudioStore(localStorage)
    s.getState().setPace('calm')
    s.getState().setLastSimulatedAt(1234)
    s.getState().setCatchupEnabled(false)
    s.getState().pushAwayReport(awayReport(1, 2))
    const stored = JSON.parse(localStorage.getItem(STUDIO_STORAGE_KEY) ?? '{}')
    expect(stored.state).toMatchObject({
      pace: 'calm',
      lastSimulatedAt: 1234,
      catchupEnabled: false,
      worldSeed: s.getState().worldSeed,
      awayLog: [awayReport(1, 2)],
    })
    expect(partialize(s.getState()).worldSeed).toHaveLength(8)
  })

  it('setDayCount sets the day count', () => {
    const s = createStudioStore(localStorage)
    s.getState().setDayCount(42)
    expect(s.getState().dayCount).toBe(42)
  })

  it('defaults to the garden pace with catch-up on and a fresh seed', () => {
    const s = createStudioStore(localStorage).getState()
    expect(s).toMatchObject({
      pace: 'garden',
      lastSimulatedAt: null,
      catchupEnabled: true,
      awayLog: [],
    })
    expect(s.worldSeed).toHaveLength(8)
  })

  it('ignores non-finite haze and mineral spots and clamps spots to 0–1', () => {
    const s = createStudioStore(localStorage)
    s.getState().setBackdropHaze(Number.NaN)
    s.getState().setMineralSpots(Number.NaN)
    expect(s.getState()).toMatchObject({ backdropHaze: 35, mineralSpots: 0 })
    s.getState().setMineralSpots(3)
    expect(s.getState().mineralSpots).toBe(1)
    s.getState().setMineralSpots(-1)
    expect(s.getState().mineralSpots).toBe(0)
  })
})
