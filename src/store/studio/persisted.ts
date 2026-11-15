import type { StudioState } from './state'

export const STUDIO_STORAGE_KEY = 'botanica_studio_v1'
/** Persisted-state version; `migrate` upgrades anything older (saves and garden snapshots alike). */
export const STUDIO_VERSION = 4

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

/** One saved terrarium: the persisted studio slice, stamped with the version it was written at. */
export type GardenSnapshot = PersistedStudio & { version?: number }
