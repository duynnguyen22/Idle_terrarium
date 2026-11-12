import { atom } from 'jotai'
import type { CareIssue } from '@/engine/care'

export interface Telemetry {
  humidity: number
  temperature: number
  soilMoisture: number
  nutrients: number
  o2Balance: number
  condensation: number
  moldCount: number
  cleanupCrewCount: number
  careIssues: CareIssue[]
}

export const DEFAULT_TELEMETRY: Telemetry = {
  humidity: 82,
  temperature: 24.5,
  soilMoisture: 74,
  nutrients: 88,
  o2Balance: 96,
  condensation: 0,
  moldCount: 0,
  cleanupCrewCount: 0,
  careIssues: [],
}

export function createDefaultTelemetry(): Telemetry {
  return { ...DEFAULT_TELEMETRY, careIssues: [] }
}

const baseTelemetryAtom = atom<Telemetry>(createDefaultTelemetry())

/**
 * Live gauges the engine flushes about 4 times a second. Deliberately not persisted: streaming
 * floats through the studio atoms would serialise the whole build several times a second. The
 * environment that survives a reload is the studio's rounded `envSeed`.
 *
 * Writing merges the defined keys; a write that changes nothing does not notify subscribers.
 */
export const telemetryAtom = atom(
  (get) => get(baseTelemetryAtom),
  (get, set, partial: Partial<Telemetry>) => {
    const cur = get(baseTelemetryAtom)
    const next: Partial<Telemetry> = {}
    let changed = false
    for (const k of Object.keys(partial) as (keyof Telemetry)[]) {
      const v = partial[k]
      if (v === undefined || v === cur[k]) continue
      // careIssues is rebuilt each report; compare by content so an equal report writes nothing.
      if (k === 'careIssues' && JSON.stringify(v) === JSON.stringify(cur.careIssues)) continue
      ;(next as Record<string, unknown>)[k] = v
      changed = true
    }
    if (changed) set(baseTelemetryAtom, { ...cur, ...next })
  },
)

/** Replaces the gauges outright (tests and resets); normal writes go through `telemetryAtom`. */
export const resetTelemetryAtom = atom(null, (_get, set, value?: Telemetry) =>
  set(baseTelemetryAtom, value ?? createDefaultTelemetry()),
)
