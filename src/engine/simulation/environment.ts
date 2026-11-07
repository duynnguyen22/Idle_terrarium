import { findCatalogDef } from '@/data/catalog'
import type { PlacedItem } from '@/data/types'
import type { StudioState } from '@/store/useStudioStore'
import { hasPool, poolHasWater } from '../geometry'
import type { EngineWorld, EnvState } from '../world'
import { isLampOn } from './clock'
import { frameScale, simSpeedMult } from './constants'
import { countCleanupCrew } from './mold'

export type EnvInputs = Pick<
  StudioState,
  | 'hasLid'
  | 'hasGrowLamp'
  | 'hasFogger'
  | 'lighting'
  | 'pumpFlow'
  | 'waterSplit'
  | 'substrates'
  | 'timeSpeed'
>

export interface EnvTargets {
  humidity: number
  temperature: number
  soilMoisture: number
  condensation: number
  o2: number
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

function isWaterfall(item: PlacedItem): boolean {
  if (item.isWaterfall) return true
  const def = findCatalogDef(item.id)
  return def !== null && def.category === 'hardscape' && !!def.isWaterfall
}

function condensationTarget(s: EnvInputs, humidity: number): number {
  return clamp(
    ((humidity - 72) / 30) * (s.hasLid ? 1 : 0.3) + (s.lighting === 'dawn' ? 0.22 : 0),
    0,
    1,
  )
}

/** Targets each gauge eases toward (prototype 3174-3205). Condensation keys off `env.humidity`. */
export function computeEnvTargets(
  s: EnvInputs,
  items: readonly PlacedItem[],
  env: EnvState,
): EnvTargets {
  const night = s.lighting === 'night'
  const lampOn = isLampOn(s)
  const pool = poolHasWater(s)
  const poolFrac = pool
    ? Math.min(1, s.waterSplit / 0.5) * Math.min(1, (s.substrates.water || 0) / 40)
    : 0
  const falls = items.some(isWaterfall)

  const humidity = clamp(
    48 +
      (s.hasLid ? 22 : 0) +
      poolFrac * 12 +
      (s.hasFogger ? 7 : 0) +
      (falls && pool && s.pumpFlow !== 'off' ? 3 : 0) +
      (night ? 4 : 0) -
      (lampOn ? 3 : 0),
    25,
    99,
  )
  const temperature =
    23 + (lampOn ? 2.5 : 0) + (s.hasLid ? 0.8 : 0) - (night ? 1.8 : 0) - (s.hasFogger ? 0.4 : 0)
  const soilMoisture =
    38 +
    (s.hasLid ? 24 : 4) +
    poolFrac * 10 +
    ((s.substrates.leaflitter || 0) > 2 ? 4 : 0) +
    env.mistBoost * 0.4

  let flora = 0
  let fauna = 0
  for (const i of items) {
    if (i.category === 'flora') flora++
    else if (i.category === 'fauna') fauna++
  }
  const photo = lampOn ? (s.lighting === 'sunlight' ? 1 : 0.6) : 0
  const o2 = clamp(
    72 + Math.min(25, flora * 2.5) * photo - (photo ? 0 : 6) - fauna * 0.6 + (s.hasLid ? 0 : 4),
    40,
    100,
  )

  return {
    humidity,
    temperature,
    soilMoisture,
    condensation: condensationTarget(s, env.humidity),
    o2,
  }
}

/**
 * Per-frame environment step (prototype 3174-3213, frame-rate independent via frameScale). The mold bloom
 * timer is driven elsewhere.
 */
export function updateEnvironment(
  world: EngineWorld,
  s: EnvInputs,
  dtMs: number,
  onToast?: (msg: string) => void,
): void {
  const env = world.env
  const speedMult = simSpeedMult(s.timeSpeed)
  const fs = frameScale(dtMs)
  const k = 0.004 * speedMult * fs

  env.mistBoost *= 1 - 0.0025 * speedMult * fs
  const t = computeEnvTargets(s, world.items, env)
  env.humidity += (Math.min(99, t.humidity + env.mistBoost) - env.humidity) * k
  env.temperature += (t.temperature - env.temperature) * k * 0.6
  env.soilMoisture += (Math.min(98, t.soilMoisture) - env.soilMoisture) * k * 0.5
  // The prototype computes the condensation target after the humidity update.
  env.condensation += (condensationTarget(s, env.humidity) - env.condensation) * k * 0.7
  env.o2 += (t.o2 - env.o2) * k

  const flora = world.items.filter((i) => i.category === 'flora').length
  const crew = countCleanupCrew(world)
  const litter = (s.substrates.leaflitter || 0) > 1 ? 1 : 0.4
  env.nutrients = clamp(
    env.nutrients + (-0.00025 * flora + 0.0003 * Math.min(4, crew) * litter) * speedMult * fs,
    15,
    100,
  )

  if (hasPool(s.waterSplit) && env.cycleProgress < 1) {
    env.cycleProgress = Math.min(
      1,
      env.cycleProgress + 0.000004 * speedMult * (s.pumpFlow === 'off' ? 0.4 : 1) * fs,
    )
    if (env.cycleProgress >= 1) onToast?.('The pool has cycled. Ammonia and nitrite read 0.')
  }
}
