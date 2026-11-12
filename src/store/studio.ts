import { atom, type Atom, type PrimitiveAtom, type Store, type WritableAtom } from 'jotai'
import { DEFAULT_SUBSTRATES } from '@/data/substrates'
import type {
  BackdropId,
  LightingId,
  PumpFlow,
  RoomEnv,
  SoundPresetId,
  GrowthStage,
  SubstrateDepths,
} from '@/data/types'
import type { VesselId } from '@/data/vessels'
import type { WorldSnapshot } from '@/engine/persistence'
import { DEFAULT_MUSIC_VOLUME } from '@/engine/audio/ambient'
import { DEFAULT_ROOM } from '@/engine/room'
import { AWAY_LOG_MAX } from '@/engine/simulation/catchup'
import type { PaceId } from '@/engine/simulation/pace'
import type { AwayReport } from '@/engine/simulation/report'
import { clamp } from '@/lib/clamp'
import { importPrototypeSave } from './importPrototypeSave'
import {
  DEFAULT_BACKDROP,
  DEFAULT_BACKDROP_HAZE,
  MAX_BACKDROP_HAZE,
  MAX_WATER_SPLIT,
  migrate,
  sanitizeAwayLog,
  sanitizeBackdropHaze,
  sanitizeMusicVolume,
  sanitizePace,
  sanitizeSoundPreset,
  sanitizeRoom,
} from './migrations'
import { DEFAULT_TELEMETRY } from './telemetry'

// The live gauges live in the unpersisted telemetry atom; re-exported so existing imports keep working.
export { DEFAULT_TELEMETRY, type Telemetry } from './telemetry'

export const STUDIO_STORAGE_KEY = 'botanica_studio_v1'
/** Persisted-state version; `migrate` upgrades anything older (saves and garden snapshots alike). */
export const STUDIO_VERSION = 4

export type HardwareKey = 'hasLid' | 'hasGrowLamp' | 'hasFogger'
export type ActiveTab = 'vessel' | 'substrate' | 'flora' | 'hardscape' | 'fauna' | (string & {})
export type ActiveTool = 'select' | 'plant' | 'pour' | (string & {})

/** Environment values that survive a reload (the prototype's saved gauges), rounded to 1 decimal. */
export interface EnvSeed {
  humidity: number
  temperature: number
  soilMoisture: number
  nutrients: number
}

export interface StudioState {
  vessel: VesselId
  hasLid: boolean
  hasGrowLamp: boolean
  hasFogger: boolean
  pumpFlow: PumpFlow
  /** Fraction of the tank width given to the pool, 0 to MAX_WATER_SPLIT. */
  waterSplit: number
  /** Nitrogen-cycle progress, 0 (fresh setup) to 1 (cycled). */
  cycleProgress: number
  /** Day the current setup was built; cycle days count from here. */
  setupDay: number
  lighting: LightingId
  autoLightSync: boolean
  timeSpeed: number
  realTimeMode: boolean
  dayCount: number
  activeTab: ActiveTab
  activeTool: ActiveTool
  plantingStage: GrowthStage
  relaxMode: boolean
  /** OS `prefers-reduced-motion`; transient (not persisted), driven by useReducedMotion. */
  reducedMotion: boolean
  audioEnabled: boolean
  soundPreset: SoundPresetId
  /** Ambient music volume, 0 to 1. */
  musicVolume: number
  substrates: SubstrateDepths
  selectedId: string | null
  activePourMaterial: string | null
  /** Persisted environment seed; the engine writes it every few seconds and seeds `world.env` from it. */
  envSeed: EnvSeed
  worldSnapshot: WorldSnapshot | null
  /** The room the tank sits in: water source, minerals, pH, outdoor air and purifier. */
  room: RoomEnv
  /** Count of mineral spots on the glass. */
  mineralSpots: number
  backdrop: BackdropId
  /** Backdrop haze percentage, 0 to 80. */
  backdropHaze: number
  /** How many real milliseconds make one tank day. */
  pace: PaceId
  /** Wall-clock ms of the last simulated moment; null until the first run. */
  lastSimulatedAt: number | null
  /** Whether time passes (is simulated) while the app is closed. */
  catchupEnabled: boolean
  /** Seed for the deterministic offline catch-up. */
  worldSeed: string
  /** Newest-first summaries of past away catch-ups, at most AWAY_LOG_MAX. */
  awayLog: AwayReport[]
}

const ENV_SEED_KEYS = ['humidity', 'temperature', 'soilMoisture', 'nutrients'] as const

export function defaultEnvSeed(): EnvSeed {
  const { humidity, temperature, soilMoisture, nutrients } = DEFAULT_TELEMETRY
  return { humidity, temperature, soilMoisture, nutrients }
}

const round1 = (v: number) => Math.round(v * 10) / 10

export function createDefaultState(): StudioState {
  return {
    vessel: 'paludarium_tank',
    hasLid: true,
    hasGrowLamp: true,
    hasFogger: true,
    pumpFlow: 'gentle',
    waterSplit: 0.32,
    cycleProgress: 1,
    setupDay: 1,
    lighting: 'sunlight',
    autoLightSync: true,
    timeSpeed: 1,
    realTimeMode: true,
    dayCount: 1,
    activeTab: 'vessel',
    activeTool: 'select',
    plantingStage: 'mature',
    relaxMode: false,
    reducedMotion: false,
    audioEnabled: false,
    soundPreset: 'stream',
    musicVolume: DEFAULT_MUSIC_VOLUME,
    substrates: { ...DEFAULT_SUBSTRATES },
    selectedId: null,
    activePourMaterial: null,
    envSeed: defaultEnvSeed(),
    worldSnapshot: null,
    room: { ...DEFAULT_ROOM },
    mineralSpots: 0,
    backdrop: DEFAULT_BACKDROP,
    backdropHaze: DEFAULT_BACKDROP_HAZE,
    pace: 'garden',
    lastSimulatedAt: null,
    catchupEnabled: true,
    worldSeed: Math.random().toString(36).slice(2, 10),
    awayLog: [],
  }
}

/** Fields written to localStorage. Transient UI is excluded; live telemetry lives in its own atom. */
export function partialize(s: StudioState) {
  return {
    vessel: s.vessel,
    hasLid: s.hasLid,
    hasGrowLamp: s.hasGrowLamp,
    hasFogger: s.hasFogger,
    pumpFlow: s.pumpFlow,
    waterSplit: s.waterSplit,
    cycleProgress: s.cycleProgress,
    setupDay: s.setupDay,
    lighting: s.lighting,
    autoLightSync: s.autoLightSync,
    timeSpeed: s.timeSpeed,
    realTimeMode: s.realTimeMode,
    dayCount: s.dayCount,
    activeTab: s.activeTab,
    plantingStage: s.plantingStage,
    audioEnabled: s.audioEnabled,
    soundPreset: s.soundPreset,
    musicVolume: s.musicVolume,
    substrates: s.substrates,
    envSeed: s.envSeed,
    worldSnapshot: s.worldSnapshot,
    room: s.room,
    mineralSpots: s.mineralSpots,
    backdrop: s.backdrop,
    backdropHaze: s.backdropHaze,
    pace: s.pace,
    lastSimulatedAt: s.lastSimulatedAt,
    catchupEnabled: s.catchupEnabled,
    worldSeed: s.worldSeed,
    awayLog: s.awayLog,
  }
}

export type PersistedStudio = ReturnType<typeof partialize>

// ---------------------------------------------------------------------------------------------
// Base atoms: one raw primitive per field. `patchStudioAtom` and hydration write these directly
// (no validation, like the old `setState`); the exported field atoms below add the setter rules.
// ---------------------------------------------------------------------------------------------

type BaseAtoms = { [K in keyof StudioState]: PrimitiveAtom<StudioState[K]> }

const DEFAULTS = createDefaultState()

const base = Object.fromEntries(
  Object.entries(DEFAULTS).map(([k, v]) => [k, atom(v)]),
) as unknown as BaseAtoms

const STUDIO_KEYS = Object.keys(DEFAULTS) as (keyof StudioState)[]
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

// ---------------------------------------------------------------------------------------------
// Persistence: the same key and `{ state, version }` envelope the zustand persist middleware
// wrote, so existing saves load unchanged.
// ---------------------------------------------------------------------------------------------

/** Sanitizes the fields a hand-edited or current-version save could carry out of range. */
function sanitizeSaved(saved: Partial<StudioState>): Partial<StudioState> {
  const out = { ...saved }
  if (Object.hasOwn(saved, 'room')) out.room = sanitizeRoom(saved.room)
  if (Object.hasOwn(saved, 'backdropHaze'))
    out.backdropHaze = sanitizeBackdropHaze(saved.backdropHaze)
  if (Object.hasOwn(saved, 'musicVolume')) out.musicVolume = sanitizeMusicVolume(saved.musicVolume)
  if (Object.hasOwn(saved, 'soundPreset')) out.soundPreset = sanitizeSoundPreset(saved.soundPreset)
  if (Object.hasOwn(saved, 'pace')) out.pace = sanitizePace(saved.pace)
  if (Object.hasOwn(saved, 'awayLog')) out.awayLog = sanitizeAwayLog(saved.awayLog)
  return out
}

function writeSave(storage: Storage, state: PersistedStudio): void {
  try {
    storage.setItem(STUDIO_STORAGE_KEY, JSON.stringify({ state, version: STUDIO_VERSION }))
  } catch {
    // Storage full or blocked: the session keeps working, it just will not survive a reload.
  }
}

/**
 * Loads the studio save from `storage` into `store`, then writes every later change of a persisted
 * field back. When the key is absent and a prototype save parses, its mapped values seed the state
 * (the old key is never deleted). Returns the unsubscribe.
 */
export function bindStudioStorage(store: Store, storage: Storage): () => void {
  let raw: string | null = null
  try {
    raw = storage.getItem(STUDIO_STORAGE_KEY)
  } catch {
    raw = null
  }

  let migrated = false
  if (raw === null) {
    let seed: Partial<StudioState> = {}
    try {
      seed = importPrototypeSave(storage) ?? {}
    } catch {
      seed = {}
    }
    store.set(patchStudioAtom, seed)
  } else {
    let saved: Partial<StudioState> = {}
    try {
      const parsed: unknown = JSON.parse(raw)
      const env = (typeof parsed === 'object' && parsed !== null ? parsed : {}) as {
        state?: unknown
        version?: number
      }
      const version = typeof env.version === 'number' ? env.version : 0
      if (version !== STUDIO_VERSION) {
        // `migrate` runs on a version change only, like the persist middleware.
        saved = migrate(env.state, version) as Partial<StudioState>
        migrated = true
      } else if (typeof env.state === 'object' && env.state !== null) {
        saved = env.state as Partial<StudioState>
      }
    } catch {
      saved = {}
    }
    // A current-version save is sanitized here; only known fields reach the store.
    const clean = sanitizeSaved(saved)
    const patch: Partial<StudioState> = {}
    for (const k of STUDIO_KEYS)
      if (Object.hasOwn(clean, k)) (patch as Record<string, unknown>)[k] = clean[k]
    store.set(patchStudioAtom, patch)
  }

  // Like the persist middleware: a migrated save is written back at once; otherwise only changes are.
  if (migrated) writeSave(storage, store.get(persistedStudioAtom))
  return store.sub(persistedStudioAtom, () => writeSave(storage, store.get(persistedStudioAtom)))
}
