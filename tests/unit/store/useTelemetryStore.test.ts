import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CareIssue } from '@/engine/care'
import {
  createDefaultTelemetry,
  DEFAULT_TELEMETRY,
  useTelemetryStore,
} from '@/store/useTelemetryStore'

beforeEach(() => useTelemetryStore.setState({ telemetry: createDefaultTelemetry() }))

describe('telemetry store', () => {
  it('defaults equal the prototype gauges', () => {
    expect(useTelemetryStore.getState().telemetry).toEqual({
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

  it('setTelemetry is a no-op for identical values', () => {
    const before = useTelemetryStore.getState()
    before.setTelemetry({ humidity: 82, nutrients: 88 })
    expect(useTelemetryStore.getState()).toBe(before)
    before.setTelemetry({ humidity: 70 })
    expect(useTelemetryStore.getState().telemetry.humidity).toBe(70)
    expect(useTelemetryStore.getState().telemetry.nutrients).toBe(88)
  })

  it('unchanged setTelemetry calls notify nobody', () => {
    const listener = vi.fn()
    const unsub = useTelemetryStore.subscribe(listener)
    const { telemetry, setTelemetry } = useTelemetryStore.getState()
    for (let i = 0; i < 10; i++) {
      setTelemetry({ humidity: telemetry.humidity, moldCount: telemetry.moldCount })
      setTelemetry({})
    }
    unsub()
    expect(listener).not.toHaveBeenCalled()
  })

  it('setTelemetry never writes undefined over existing keys', () => {
    useTelemetryStore.getState().setTelemetry({ humidity: 50, nutrients: undefined })
    expect(useTelemetryStore.getState().telemetry.humidity).toBe(50)
    expect(useTelemetryStore.getState().telemetry.nutrients).toBe(88)
  })

  it('setTelemetry ignores an identical careIssues array', () => {
    const { setTelemetry } = useTelemetryStore.getState()
    const issues: CareIssue[] = [{ level: 'warn', text: 'x' }]
    setTelemetry({ careIssues: issues })
    const before = useTelemetryStore.getState().telemetry
    expect(before.careIssues).toEqual(issues)
    setTelemetry({ careIssues: [{ level: 'warn', text: 'x' }] })
    expect(useTelemetryStore.getState().telemetry).toBe(before)
    setTelemetry({ careIssues: [] })
    expect(useTelemetryStore.getState().telemetry.careIssues).toEqual([])
  })

  it('never touches storage', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    useTelemetryStore.getState().setTelemetry({ humidity: 61.234, temperature: 27.1 })
    expect(setItem).not.toHaveBeenCalled()
    setItem.mockRestore()
  })
})
