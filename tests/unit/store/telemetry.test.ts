import { createStore } from 'jotai'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CareIssue } from '@/engine/care'
import { bindStudioStorage } from '@/store/studio'
import {
  createDefaultTelemetry,
  DEFAULT_TELEMETRY,
  resetTelemetryAtom,
  telemetryAtom,
} from '@/store/telemetry'

const store = createStore()

beforeEach(() => store.set(resetTelemetryAtom))

describe('telemetry atom', () => {
  it('defaults equal the prototype gauges', () => {
    expect(store.get(telemetryAtom)).toEqual({
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
    expect(createDefaultTelemetry().careIssues).not.toBe(DEFAULT_TELEMETRY.careIssues)
  })

  it('a write is a no-op for identical values', () => {
    const before = store.get(telemetryAtom)
    store.set(telemetryAtom, { humidity: 82, nutrients: 88 })
    expect(store.get(telemetryAtom)).toBe(before)
    store.set(telemetryAtom, { humidity: 70 })
    expect(store.get(telemetryAtom).humidity).toBe(70)
    expect(store.get(telemetryAtom).nutrients).toBe(88)
  })

  it('unchanged writes notify nobody', () => {
    const listener = vi.fn()
    const unsub = store.sub(telemetryAtom, listener)
    const telemetry = store.get(telemetryAtom)
    for (let i = 0; i < 10; i++) {
      store.set(telemetryAtom, { humidity: telemetry.humidity, moldCount: telemetry.moldCount })
      store.set(telemetryAtom, {})
    }
    unsub()
    expect(listener).not.toHaveBeenCalled()
  })

  it('a write never puts undefined over existing keys', () => {
    store.set(telemetryAtom, { humidity: 50, nutrients: undefined })
    expect(store.get(telemetryAtom).humidity).toBe(50)
    expect(store.get(telemetryAtom).nutrients).toBe(88)
  })

  it('a write ignores an identical careIssues array', () => {
    const issues: CareIssue[] = [{ level: 'warn', text: 'x' }]
    store.set(telemetryAtom, { careIssues: issues })
    const before = store.get(telemetryAtom)
    expect(before.careIssues).toEqual(issues)
    store.set(telemetryAtom, { careIssues: [{ level: 'warn', text: 'x' }] })
    expect(store.get(telemetryAtom)).toBe(before)
    store.set(telemetryAtom, { careIssues: [] })
    expect(store.get(telemetryAtom).careIssues).toEqual([])
  })

  it('never touches storage, even in a store bound to the studio save', () => {
    const bound = createStore()
    const unbind = bindStudioStorage(bound, localStorage)
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    bound.set(telemetryAtom, { humidity: 61.234, temperature: 27.1 })
    expect(bound.get(telemetryAtom).humidity).toBe(61.234)
    expect(setItem).not.toHaveBeenCalled()
    setItem.mockRestore()
    unbind()
  })
})
