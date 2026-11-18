import { AWAY_LOG_MAX, type AwayReport } from '@/data/events'
import { atom, type Atom, type PrimitiveAtom, type WritableAtom } from 'jotai'
import type { RoomEnv, SubstrateDepths } from '@/data/types'
import { clamp } from '@/lib/clamp'
import { MAX_BACKDROP_HAZE, MAX_WATER_SPLIT, sanitizeRoom } from '../migrations'
import { partialize, type PersistedStudio } from './persisted'
import {
  createDefaultState,
  defaultEnvSeed,
  type EnvSeed,
  type HardwareKey,
  type StudioState,
} from './state'

const ENV_SEED_KEYS = ['humidity', 'temperature', 'soilMoisture', 'nutrients'] as const

const round1 = (v: number) => Math.round(v * 10) / 10

// ---------------------------------------------------------------------------------------------
// Base atoms: one raw primitive per field. `patchStudioAtom` and hydration write these directly
// (no validation, like the old `setState`); the exported field atoms below add the setter rules.
// ---------------------------------------------------------------------------------------------

type BaseAtoms = { [K in keyof StudioState]: PrimitiveAtom<StudioState[K]> }

const DEFAULTS = createDefaultState()

const base = Object.fromEntries(
  Object.entries(DEFAULTS).map(([k, v]) => [k, atom(v)]),
) as unknown as BaseAtoms

export const STUDIO_KEYS = Object.keys(DEFAULTS) as (keyof StudioState)[]
const PERSISTED_KEYS = Object.keys(partialize(DEFAULTS)) as (keyof PersistedStudio)[]

/** A field atom that reads the base atom and writes `write(next, current)` unless it returns undefined. */
function guarded<K extends keyof StudioState, A>(
  key: K,
  write: (next: A, cur: StudioState[K]) => StudioState[K] | undefined,
): WritableAtom<StudioState[K], [A], void> {
  const a = base[key]
  return atom(
    (get) => get(a),
    (get, set, next: A) => {
      const v = write(next, get(a))
      if (v !== undefined) set(a, v)
    },
  )
}

// Plain fields: read and written as-is.
export const vesselAtom = base.vessel
export const hasLidAtom = base.hasLid
export const hasGrowLampAtom = base.hasGrowLamp
export const lampColorAtom = base.lampColor
export const hasFoggerAtom = base.hasFogger
export const pumpFlowAtom = base.pumpFlow
export const setupDayAtom = base.setupDay
export const lightingAtom = base.lighting
export const autoLightSyncAtom = base.autoLightSync
export const timeSpeedAtom = base.timeSpeed
export const realTimeModeAtom = base.realTimeMode
export const dayCountAtom = base.dayCount
export const activeTabAtom = base.activeTab
export const activeToolAtom = base.activeTool
export const plantingStageAtom = base.plantingStage
export const relaxModeAtom = base.relaxMode
export const reducedMotionAtom = base.reducedMotion
export const audioEnabledAtom = base.audioEnabled
export const soundPresetAtom = base.soundPreset
export const selectedIdAtom = base.selectedId
export const activePourMaterialAtom = base.activePourMaterial
export const worldSnapshotAtom = base.worldSnapshot
export const backdropAtom = base.backdrop
export const paceAtom = base.pace
export const lastSimulatedAtAtom = base.lastSimulatedAt
export const catchupEnabledAtom = base.catchupEnabled
export const worldSeedAtom = base.worldSeed
export const awayLogAtom = base.awayLog

/** The three hardware toggles, by key. */
export const hardwareAtoms: Record<HardwareKey, PrimitiveAtom<boolean>> = {
  hasLid: base.hasLid,
  hasGrowLamp: base.hasGrowLamp,
  hasFogger: base.hasFogger,
}

// Fields with setter rules.

/** Writes are clamped to 0 to MAX_WATER_SPLIT. */
export const waterSplitAtom = guarded('waterSplit', (v: number) => clamp(v, 0, MAX_WATER_SPLIT))
/** Writes are clamped to 0 to 1. */
export const cycleProgressAtom = guarded('cycleProgress', (v: number) => clamp(v, 0, 1))
/** Writes are clamped to 0 to 1; non-finite values are ignored. */
export const musicVolumeAtom = guarded('musicVolume', (v: number) =>
  Number.isFinite(v) ? clamp(v, 0, 1) : undefined,
)
/** Writes are clamped to 0 to 1; non-finite values are ignored. */
export const mineralSpotsAtom = guarded('mineralSpots', (v: number) =>
  Number.isFinite(v) ? clamp(v, 0, 1) : undefined,
)
/** Writes are clamped to 0 to 80; non-finite values are ignored. */
export const backdropHazeAtom = guarded('backdropHaze', (v: number) =>
  Number.isFinite(v) ? clamp(v, 0, MAX_BACKDROP_HAZE) : undefined,
)
/** Writes replace the depths; an identical set is skipped (it would rewrite the save). */
export const substratesAtom = guarded('substrates', (next: SubstrateDepths, cur) => {
  const keys = new Set([...Object.keys(cur), ...Object.keys(next)]) as Set<keyof SubstrateDepths>
  if ([...keys].every((k) => cur[k] === next[k])) return undefined
  return { ...next }
})
/** Writes merge the patch, then clamp tds and pH and drop unknown source ids. */
export const roomAtom = guarded('room', (patch: Partial<RoomEnv>, cur) =>
  sanitizeRoom({ ...cur, ...patch }),
)
/**
 * Writes round to 1 decimal and keep the current value for a non-finite reading; a no-op when all
 * four rounded values are unchanged.
 */
export const envSeedAtom = guarded('envSeed', (seed: EnvSeed, stored) => {
  // A hand-edited save could hydrate a null seed; treat it as the defaults.
  const cur = stored ?? defaultEnvSeed()
  const next = {} as EnvSeed
  for (const k of ENV_SEED_KEYS) next[k] = Number.isFinite(seed[k]) ? round1(seed[k]) : cur[k]
  if (ENV_SEED_KEYS.every((k) => cur[k] === next[k])) return undefined
  return next
})

// Compound actions.

export const toggleHardwareAtom = atom(null, (get, set, key: HardwareKey) =>
  set(hardwareAtoms[key], !get(hardwareAtoms[key])),
)
export const setSubstrateAtom = atom(null, (get, set, id: keyof SubstrateDepths, mm: number) =>
  set(base.substrates, { ...get(base.substrates), [id]: mm }),
)
/** Prepends the report and keeps the newest AWAY_LOG_MAX. */
export const pushAwayReportAtom = atom(null, (get, set, r: AwayReport) =>
  set(base.awayLog, [r, ...get(base.awayLog)].slice(0, AWAY_LOG_MAX)),
)

/** Writes several fields at once, raw (no setter rules), like the old store's `setState`. */
export const patchStudioAtom = atom(null, (_get, set, patch: Partial<StudioState>) => {
  for (const k of Object.keys(patch) as (keyof StudioState)[])
    if (Object.hasOwn(base, k)) set(base[k] as PrimitiveAtom<unknown>, patch[k])
})

/**
 * Resets the persisted state only (reducedMotion is kept). Nothing in src calls it; a caller with a
 * mounted engine must also zero `world.ecoTime` and `world.breed` (the store never touches the
 * engine), or flushTelemetry would write the old day count back.
 */
export const resetStudioAtom = atom(null, (_get, set) => {
  const fresh: Partial<StudioState> = createDefaultState()
  delete fresh.reducedMotion
  set(patchStudioAtom, fresh)
})

/**
 * The whole studio state as one object, for pure helpers that take it (gardenSummary, isLampOn,
 * applyPreset, seedWorldEnv) and for imperative reads. Components should read the field atoms
 * instead: this one changes whenever any field does.
 */
export const studioStateAtom = atom((get) => {
  const out = {} as Record<string, unknown>
  for (const k of STUDIO_KEYS) out[k] = get(base[k] as Atom<unknown>)
  return out as unknown as StudioState
})

/** The persisted slice; changes only when a persisted field does. */
export const persistedStudioAtom = atom((get) => {
  const out = {} as Record<string, unknown>
  for (const k of PERSISTED_KEYS) out[k] = get(base[k] as Atom<unknown>)
  return out as unknown as PersistedStudio
})
