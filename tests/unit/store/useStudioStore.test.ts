import { beforeEach, describe, expect, it } from 'vitest'
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
        pebbles: 10,
        lavarock: 8,
        charcoal: 6,
        moss: 8,
        soil: 16,
        rivergravel: 16,
        sand: 0,
        water: 24,
      },
    })
    expect(s.telemetry).toMatchObject({
      humidity: 82,
      soilMoisture: 76,
      nutrients: 88,
      o2Balance: 96,
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
    expect(stored.version).toBe(1)
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
})
