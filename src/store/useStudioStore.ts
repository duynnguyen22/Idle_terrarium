import { create, type StoreApi, type UseBoundStore } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
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
import { DEFAULT_ROOM } from '@/engine/room'
import { clamp } from '@/lib/clamp'
import { importPrototypeSave } from './importPrototypeSave'
import {
  DEFAULT_BACKDROP,
  DEFAULT_BACKDROP_HAZE,
  MAX_BACKDROP_HAZE,
  MAX_WATER_SPLIT,
  migrate,
  sanitizeBackdropHaze,
  sanitizeRoom,
} from './migrations'
import { DEFAULT_TELEMETRY } from './useTelemetryStore'

// The live gauges live in the unpersisted telemetry store; re-exported so existing imports keep working.
export { DEFAULT_TELEMETRY, type Telemetry } from './useTelemetryStore'

export const STUDIO_STORAGE_KEY = 'botanica_studio_v1'

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
}

export interface StudioActions {
  setVessel: (id: VesselId) => void
  toggleHardware: (key: HardwareKey) => void
  setHardware: (key: HardwareKey, value: boolean) => void
  setPumpFlow: (flow: PumpFlow) => void
  setWaterSplit: (v: number) => void
  setCycleProgress: (v: number) => void
  setSetupDay: (day: number) => void
  setLighting: (id: LightingId) => void
  setAutoLightSync: (v: boolean) => void
  setTimeSpeed: (v: number) => void
  setRealTimeMode: (v: boolean) => void
  setActiveTab: (tab: ActiveTab) => void
  setActiveTool: (tool: ActiveTool) => void
  setPlantingStage: (stage: GrowthStage) => void
  setRelaxMode: (v: boolean) => void
  setReducedMotion: (v: boolean) => void
  setAudioEnabled: (v: boolean) => void
  setSoundPreset: (id: SoundPresetId) => void
  setSubstrate: (id: keyof SubstrateDepths, mm: number) => void
  setSubstrates: (obj: SubstrateDepths) => void
  selectItem: (id: string | null) => void
  setActivePourMaterial: (id: string | null) => void
  advanceDay: () => void
  /** Rounds to 1 decimal; a no-op when all four rounded values are unchanged. */
  setEnvSeed: (seed: EnvSeed) => void
  setWorldSnapshot: (snapshot: WorldSnapshot | null) => void
  /** Merges the patch, then clamps tds and pH and drops unknown source ids. */
  setRoom: (patch: Partial<RoomEnv>) => void
  setMineralSpots: (v: number) => void
  setBackdrop: (id: BackdropId) => void
  /** Clamped to 0 to 80. */
  setBackdropHaze: (v: number) => void
  resetStudio: () => void
}

export type StudioStore = StudioState & StudioActions

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
    substrates: { ...DEFAULT_SUBSTRATES },
    selectedId: null,
    activePourMaterial: null,
    envSeed: defaultEnvSeed(),
    worldSnapshot: null,
    room: { ...DEFAULT_ROOM },
    mineralSpots: 0,
    backdrop: DEFAULT_BACKDROP,
    backdropHaze: DEFAULT_BACKDROP_HAZE,
  }
}

/** Fields written to localStorage. Transient UI is excluded; live telemetry lives in its own store. */
export function partialize(s: StudioStore) {
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
    substrates: s.substrates,
    envSeed: s.envSeed,
    worldSnapshot: s.worldSnapshot,
    room: s.room,
    mineralSpots: s.mineralSpots,
    backdrop: s.backdrop,
    backdropHaze: s.backdropHaze,
  }
}

export type StudioStoreHook = UseBoundStore<StoreApi<StudioStore>>

/**
 * Builds a store bound to `storage`. When the new key is absent and a prototype save
 * parses, its mapped values seed the initial state (the old key is never deleted).
 */
export function createStudioStore(storage: Storage = localStorage): StudioStoreHook {
  let seed: Partial<StudioState> = {}
  try {
    if (storage.getItem(STUDIO_STORAGE_KEY) === null) seed = importPrototypeSave(storage) ?? {}
  } catch {
    seed = {}
  }

  return create<StudioStore>()(
    persist(
      (set, get) => ({
        ...createDefaultState(),
        ...seed,
        setVessel: (vessel) => set({ vessel }),
        toggleHardware: (key) => set((s) => ({ [key]: !s[key] })),
        setHardware: (key, value) => set({ [key]: value }),
        setPumpFlow: (pumpFlow) => set({ pumpFlow }),
        setWaterSplit: (v) => set({ waterSplit: clamp(v, 0, MAX_WATER_SPLIT) }),
        setCycleProgress: (v) => set({ cycleProgress: clamp(v, 0, 1) }),
        setSetupDay: (setupDay) => set({ setupDay }),
        setLighting: (lighting) => set({ lighting }),
        setAutoLightSync: (autoLightSync) => set({ autoLightSync }),
        setTimeSpeed: (timeSpeed) => set({ timeSpeed }),
        setRealTimeMode: (realTimeMode) => set({ realTimeMode }),
        setActiveTab: (activeTab) => set({ activeTab }),
        setActiveTool: (activeTool) => set({ activeTool }),
        setPlantingStage: (plantingStage) => set({ plantingStage }),
        setRelaxMode: (relaxMode) => set({ relaxMode }),
        setReducedMotion: (reducedMotion) => set({ reducedMotion }),
        setAudioEnabled: (audioEnabled) => set({ audioEnabled }),
        setSoundPreset: (soundPreset) => set({ soundPreset }),
        setSubstrate: (id, mm) => set((s) => ({ substrates: { ...s.substrates, [id]: mm } })),
        setSubstrates: (substrates) => {
          // Skip set() when unchanged: persist writes storage on every set(), even for an identical state.
          const cur = get().substrates
          const keys = new Set([...Object.keys(cur), ...Object.keys(substrates)]) as Set<
            keyof SubstrateDepths
          >
          if ([...keys].every((k) => cur[k] === substrates[k])) return
          set({ substrates: { ...substrates } })
        },
        selectItem: (selectedId) => set({ selectedId }),
        setActivePourMaterial: (activePourMaterial) => set({ activePourMaterial }),
        advanceDay: () => set((s) => ({ dayCount: s.dayCount + 1 })),
        setEnvSeed: (seed) => {
          // A hand-edited save could hydrate a null seed; treat it as the defaults.
          const cur = get().envSeed ?? defaultEnvSeed()
          const next = {} as EnvSeed
          // A non-finite value keeps the current one, so a bad reading can never poison the save.
          for (const k of ENV_SEED_KEYS)
            next[k] = Number.isFinite(seed[k]) ? round1(seed[k]) : cur[k]
          // Skip set(): persist would rewrite storage for an identical seed.
          if (ENV_SEED_KEYS.every((k) => cur[k] === next[k])) return
          set({ envSeed: next })
        },
        setWorldSnapshot: (worldSnapshot) => set({ worldSnapshot }),
        setRoom: (patch) => set((s) => ({ room: sanitizeRoom({ ...s.room, ...patch }) })),
        setMineralSpots: (v) => {
          if (Number.isFinite(v)) set({ mineralSpots: clamp(v, 0, 1) })
        },
        setBackdrop: (backdrop) => set({ backdrop }),
        setBackdropHaze: (v) => {
          if (Number.isFinite(v)) set({ backdropHaze: clamp(v, 0, MAX_BACKDROP_HAZE) })
        },
        resetStudio: () =>
          set((s) => ({ ...createDefaultState(), reducedMotion: s.reducedMotion })),
      }),
      {
        name: STUDIO_STORAGE_KEY,
        version: 3,
        storage: createJSONStorage(() => storage),
        partialize,
        migrate: (persisted, version) => migrate(persisted, version) as unknown as StudioStore,
        // `migrate` only runs on a version change, so a current-version save is sanitized here.
        merge: (persisted, current) => {
          const saved = (
            typeof persisted === 'object' && persisted !== null ? persisted : {}
          ) as Partial<StudioStore>
          const merged = { ...current, ...saved }
          if (Object.hasOwn(saved, 'room')) merged.room = sanitizeRoom(saved.room)
          if (Object.hasOwn(saved, 'backdropHaze'))
            merged.backdropHaze = sanitizeBackdropHaze(saved.backdropHaze)
          return merged
        },
      },
    ),
  )
}

export const useStudioStore = createStudioStore()
export default useStudioStore
