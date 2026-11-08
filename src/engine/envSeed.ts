import { finiteOr } from '@/lib/finite'
import type { StudioState } from '@/store/useStudioStore'
import { DEFAULT_TELEMETRY } from '@/store/useTelemetryStore'
import type { EngineWorld } from './world'

/**
 * Seeds the world's live environment from persisted studio state. The environment is not part of
 * the world snapshot: humidity, temperature, soil moisture and nutrients resume from `envSeed`
 * (a missing or non-finite field falls back to the default gauge); O2 and condensation always restart
 * from the defaults and re-converge within seconds; cycle progress and glass residue resume from the
 * store. Used when the engine starts and when a saved terrarium is opened.
 */
export function seedWorldEnv(
  world: EngineWorld,
  state: Pick<StudioState, 'envSeed' | 'cycleProgress' | 'mineralSpots'>,
): void {
  const seed: Partial<Record<keyof StudioState['envSeed'], unknown>> = state.envSeed ?? {}
  const d = DEFAULT_TELEMETRY
  Object.assign(world.env, {
    humidity: finiteOr(seed.humidity, d.humidity),
    temperature: finiteOr(seed.temperature, d.temperature),
    soilMoisture: finiteOr(seed.soilMoisture, d.soilMoisture),
    nutrients: finiteOr(seed.nutrients, d.nutrients),
    o2: d.o2Balance,
    condensation: d.condensation,
    cycleProgress: finiteOr(state.cycleProgress, 1),
  })
  world.mineralSpots = finiteOr(state.mineralSpots, 0)
}
