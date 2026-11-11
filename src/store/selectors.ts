import type { StudioStore } from './useStudioStore'
import type { TelemetryStore } from './useTelemetryStore'

export const selectVessel = (s: StudioStore) => s.vessel
export const selectLighting = (s: StudioStore) => s.lighting
export const selectAutoLightSync = (s: StudioStore) => s.autoLightSync
export const selectPumpFlow = (s: StudioStore) => s.pumpFlow
export const selectWaterSplit = (s: StudioStore) => s.waterSplit
export const selectCycleProgress = (s: StudioStore) => s.cycleProgress
export const selectSubstrates = (s: StudioStore) => s.substrates
/** Live gauges: use with `useTelemetryStore`, not the studio store. */
export const selectTelemetry = (s: TelemetryStore) => s.telemetry
export const selectSelectedId = (s: StudioStore) => s.selectedId
export const selectDayCount = (s: StudioStore) => s.dayCount
export const selectActiveTab = (s: StudioStore) => s.activeTab
export const selectActiveTool = (s: StudioStore) => s.activeTool
export const selectPlantingStage = (s: StudioStore) => s.plantingStage
export const selectRelaxMode = (s: StudioStore) => s.relaxMode
export const selectAudioEnabled = (s: StudioStore) => s.audioEnabled
export const selectSoundPreset = (s: StudioStore) => s.soundPreset
export const selectHardware = (s: StudioStore) => ({
  hasLid: s.hasLid,
  hasGrowLamp: s.hasGrowLamp,
  hasFogger: s.hasFogger,
})
export const selectMusicVolume = (s: StudioStore) => s.musicVolume
export const selectPace = (s: StudioStore) => s.pace
export const selectCatchupEnabled = (s: StudioStore) => s.catchupEnabled
export const selectAwayLog = (s: StudioStore) => s.awayLog
