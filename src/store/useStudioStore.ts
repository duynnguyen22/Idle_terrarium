import { create, type StoreApi, type UseBoundStore } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { DEFAULT_SUBSTRATES } from '@/data/substrates'
import type { LightingId, PumpFlow, SoundPresetId, GrowthStage, SubstrateDepths } from '@/data/types'
import type { VesselId } from '@/data/vessels'
import type { CareIssue } from '@/engine/care'
import type { WorldSnapshot } from '@/engine/persistence'
import { clamp } from '@/lib/clamp'
import { importPrototypeSave } from './importPrototypeSave'
import { MAX_WATER_SPLIT, migrate } from './migrations'

export const STUDIO_STORAGE_KEY = 'botanica_studio_v1'

export type HardwareKey = 'hasLid' | 'hasGrowLamp' | 'hasFogger'
export type ActiveTab = 'vessel' | 'substrate' | 'flora' | 'hardscape' | 'fauna' | (string & {})
export type ActiveTool = 'select' | 'plant' | 'pour' | (string & {})

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
  telemetry: Telemetry
  worldSnapshot: WorldSnapshot | null
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
  setTelemetry: (partial: Partial<Telemetry>) => void
  setWorldSnapshot: (snapshot: WorldSnapshot | null) => void
  resetStudio: () => void
}

export type StudioStore = StudioState & StudioActions

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
    telemetry: { ...DEFAULT_TELEMETRY, careIssues: [] },
    worldSnapshot: null,
  }
}

/** Fields written to localStorage. Transient UI and telemetry are excluded. */
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
    worldSnapshot: s.worldSnapshot,
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
        setTelemetry: (partial) => {
          const cur = get().telemetry
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
          if (changed) set({ telemetry: { ...cur, ...next } })
        },
        setWorldSnapshot: (worldSnapshot) => set({ worldSnapshot }),
        resetStudio: () =>
          set((s) => ({ ...createDefaultState(), reducedMotion: s.reducedMotion })),
      }),
      {
        name: STUDIO_STORAGE_KEY,
        version: 2,
        storage: createJSONStorage(() => storage),
        partialize,
        migrate: (persisted, version) => migrate(persisted, version) as unknown as StudioStore,
      },
    ),
  )
}

export const useStudioStore = createStudioStore()
export default useStudioStore
