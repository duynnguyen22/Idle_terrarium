import type { WorldSnapshot } from '@/data/world'
import { DEFAULT_MUSIC_VOLUME } from '@/data/soundPresets'
import { DEFAULT_ROOM } from '@/data/room'
import type { AwayReport } from '@/data/events'
import type { PaceId } from '@/data/pace'
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
import { DEFAULT_BACKDROP, DEFAULT_BACKDROP_HAZE } from '../migrations'
import { DEFAULT_TELEMETRY } from '../telemetry'

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

export function defaultEnvSeed(): EnvSeed {
  const { humidity, temperature, soilMoisture, nutrients } = DEFAULT_TELEMETRY
  return { humidity, temperature, soilMoisture, nutrients }
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
