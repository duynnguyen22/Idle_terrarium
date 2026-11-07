import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CareIssue } from '@/engine/care'
import { createStudioStore, partialize, STUDIO_STORAGE_KEY } from '@/store/useStudioStore'

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
    expect(s.telemetry).toEqual({
      humidity: 82,
      temperature: 24.5,
      soilMoisture: 74,
      nutrients: 88,
      o2Balance: 96,
      condensation: 0,
      moldCount: 0,
      cleanupCrewCount: 0,
      careIssues: [],
    })
  })

  it('partialize excludes transient fields', () => {
    const p = partialize(createStudioStore(localStorage).getState())
    for (const k of ['selectedId', 'activeTool', 'relaxMode', 'telemetry', 'activePourMaterial']) {
      expect(p).not.toHaveProperty(k)
    }
    expect(p).toHaveProperty('worldSnapshot')
    expect(p).toHaveProperty('substrates')
  })

  it('setTelemetry is a no-op for identical values', () => {
    const store = createStudioStore(localStorage)
    const before = store.getState()
    store.getState().setTelemetry({ humidity: 82, nutrients: 88 })
    expect(store.getState()).toBe(before)
    store.getState().setTelemetry({ humidity: 70 })
    expect(store.getState().telemetry.humidity).toBe(70)
    expect(store.getState().telemetry.nutrients).toBe(88)
  })

  it('actions update state and persist non-transient fields', () => {
    const store = createStudioStore(localStorage)
    const a = store.getState()
    a.toggleHardware('hasLid')
    a.setSubstrate('sand', 5)
    a.advanceDay()
    a.selectItem('x')
    expect(store.getState()).toMatchObject({ hasLid: false, dayCount: 2, selectedId: 'x' })
    expect(store.getState().substrates.sand).toBe(5)
    const stored = JSON.parse(localStorage.getItem(STUDIO_STORAGE_KEY) ?? '{}')
    expect(stored.version).toBe(2)
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

  it('unchanged setTelemetry/setSubstrates calls notify nobody and write no storage', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    const store = createStudioStore(localStorage)
    const listener = vi.fn()
    store.subscribe(listener)
    setItem.mockClear()
    const { telemetry, substrates } = store.getState()
    for (let i = 0; i < 10; i++) {
      store
        .getState()
        .setTelemetry({ humidity: telemetry.humidity, moldCount: telemetry.moldCount })
      store.getState().setTelemetry({})
      store.getState().setSubstrates({ ...substrates })
    }
    expect(listener).not.toHaveBeenCalled()
    expect(setItem).not.toHaveBeenCalled()
    setItem.mockRestore()
  })

  it('setTelemetry never writes undefined over existing keys', () => {
    const store = createStudioStore(localStorage)
    store.getState().setTelemetry({ humidity: 50, nutrients: undefined })
    expect(store.getState().telemetry.humidity).toBe(50)
    expect(store.getState().telemetry.nutrients).toBe(88)
  })

  it('setWaterSplit clamps to [0, 0.6] and persists pool fields', () => {
    const store = createStudioStore(localStorage)
    store.getState().setWaterSplit(0.9)
    expect(store.getState().waterSplit).toBe(0.6)
    store.getState().setPumpFlow('strong')
    store.getState().setCycleProgress(0.4)
    expect(partialize(store.getState())).toMatchObject({ waterSplit: 0.6, pumpFlow: 'strong', cycleProgress: 0.4 })
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

  it('setTelemetry ignores an identical careIssues array', () => {
    const store = createStudioStore(localStorage)
    const issues: CareIssue[] = [{ level: 'warn', text: 'x' }]
    store.getState().setTelemetry({ careIssues: issues })
    const before = store.getState().telemetry
    expect(before.careIssues).toEqual(issues)
    store.getState().setTelemetry({ careIssues: [{ level: 'warn', text: 'x' }] })
    expect(store.getState().telemetry).toBe(before)
    store.getState().setTelemetry({ careIssues: [] })
    expect(store.getState().telemetry.careIssues).toEqual([])
  })

  it('hydrates a persisted v1 save through the v1 to v2 migration', () => {
    localStorage.setItem(
      STUDIO_STORAGE_KEY,
      JSON.stringify({
        state: {
          dayCount: 7,
          substrates: { pebbles: 10, lavarock: 8, charcoal: 6, moss: 8, soil: 16, rivergravel: 16, sand: 0, water: 24 },
        },
        version: 1,
      }),
    )
    const s = createStudioStore(localStorage).getState()
    expect(s.substrates).toEqual({ pebbles: 18, charcoal: 6, soil: 24, sand: 0, leaflitter: 0, rivergravel: 16, water: 24 })
    expect(s).toMatchObject({ dayCount: 7, setupDay: 7, pumpFlow: 'gentle', waterSplit: 0.32, cycleProgress: 1 })
    expect(s.substrates).not.toHaveProperty('lavarock')
  })
})
