import { create, type StoreApi, type UseBoundStore } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { DEFAULT_SUBSTRATES } from '@/data/substrates'
import type { LightingId, SoundPresetId, GrowthStage, SubstrateDepths } from '@/data/types'
import type { VesselId } from '@/data/vessels'
import type { WorldSnapshot } from '@/engine/persistence'
import { importPrototypeSave } from './importPrototypeSave'
import { migrate } from './migrations'

export const STUDIO_STORAGE_KEY = 'botanica_studio_v1'

export type HardwareKey = 'hasLid' | 'hasGrowLamp' | 'hasFogger'
export type ActiveTab = 'vessel' | 'substrate' | 'flora' | 'hardscape' | 'fauna' | (string & {})
export type ActiveTool = 'select' | 'plant' | 'pour' | (string & {})

export interface Telemetry {
  humidity: number
  soilMoisture: number
  nutrients: number
  o2Balance: number
  moldCount: number
  cleanupCrewCount: number
  mossCoverPct: number
  waterCycle: string
  note: string
}

export interface StudioState {
  vessel: VesselId
  hasLid: boolean
  hasGrowLamp: boolean
  hasFogger: boolean
  lighting: LightingId
  autoLightSync: boolean
  timeSpeed: number
  realTimeMode: boolean
  dayCount: number
  activeTab: ActiveTab
  activeTool: ActiveTool
  plantingStage: GrowthStage
  relaxMode: boolean
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
  setLighting: (id: LightingId) => void
  setAutoLightSync: (v: boolean) => void
  setTimeSpeed: (v: number) => void
  setRealTimeMode: (v: boolean) => void
  setActiveTab: (tab: ActiveTab) => void
  setActiveTool: (tool: ActiveTool) => void
  setPlantingStage: (stage: GrowthStage) => void
  setRelaxMode: (v: boolean) => void
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
  soilMoisture: 76,
  nutrients: 88,
  o2Balance: 96,
  moldCount: 0,
  cleanupCrewCount: 0,
  mossCoverPct: 28,
  waterCycle: 'Cascading & Mist',
  note: 'Semi-aquatic waterfall circulates fresh oxygenated water while the Halo LED lamp nurtures epiphytic ferns and moss along the cliff wall.',
}

export function createDefaultState(): StudioState {
  return {
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
    relaxMode: false,
    audioEnabled: false,
    soundPreset: 'stream',
    substrates: { ...DEFAULT_SUBSTRATES },
    selectedId: null,
    activePourMaterial: null,
    telemetry: { ...DEFAULT_TELEMETRY },
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
      (set) => ({
        ...createDefaultState(),
        ...seed,
        setVessel: (vessel) => set({ vessel }),
        toggleHardware: (key) => set((s) => ({ [key]: !s[key] })),
        setLighting: (lighting) => set({ lighting }),
        setAutoLightSync: (autoLightSync) => set({ autoLightSync }),
        setTimeSpeed: (timeSpeed) => set({ timeSpeed }),
        setRealTimeMode: (realTimeMode) => set({ realTimeMode }),
        setActiveTab: (activeTab) => set({ activeTab }),
        setActiveTool: (activeTool) => set({ activeTool }),
        setPlantingStage: (plantingStage) => set({ plantingStage }),
        setRelaxMode: (relaxMode) => set({ relaxMode }),
        setAudioEnabled: (audioEnabled) => set({ audioEnabled }),
        setSoundPreset: (soundPreset) => set({ soundPreset }),
        setSubstrate: (id, mm) => set((s) => ({ substrates: { ...s.substrates, [id]: mm } })),
        setSubstrates: (substrates) => set({ substrates: { ...substrates } }),
        selectItem: (selectedId) => set({ selectedId }),
        setActivePourMaterial: (activePourMaterial) => set({ activePourMaterial }),
        advanceDay: () => set((s) => ({ dayCount: s.dayCount + 1 })),
        setTelemetry: (partial) =>
          set((s) => {
            const keys = Object.keys(partial) as (keyof Telemetry)[]
            if (keys.every((k) => partial[k] === undefined || partial[k] === s.telemetry[k]))
              return s
            return { telemetry: { ...s.telemetry, ...partial } }
          }),
        setWorldSnapshot: (worldSnapshot) => set({ worldSnapshot }),
        resetStudio: () => set({ ...createDefaultState() }),
      }),
      {
        name: STUDIO_STORAGE_KEY,
        version: 1,
        storage: createJSONStorage(() => storage),
        partialize,
        migrate: (persisted, version) => migrate(persisted, version) as StudioStore,
      },
    ),
  )
}

export const useStudioStore = createStudioStore()
export default useStudioStore
