import { LAND_LAYER_IDS, SUBSTRATE_LAYERS } from '@/data/substrates'
import type { StudioState } from '@/store/studio'
import {
  CONTOUR_X_MAX,
  CONTOUR_X_MIN,
  getSoilSurfaceNormalizedY,
  getWaterTopNormY,
  hasPool,
  isInPool,
} from '../geometry'
import type { EngineWorld, WorldEntity } from '../world'
import { frameScale, type Rng } from './constants'
import { effectiveSubstrate, effectiveSubstrates, setEffectiveSubstrate } from './telemetry'

export const GRAVITY = 0.00085
export const MAX_WATER_MM = 80
export const MAX_GRAVEL_MM = 30
export const MAX_LAND_MM = 60
export const MAX_CONTOUR_MM = 18
export const MAX_SURFACE_GRAINS = 220
/** Water split a first water landing sets when the build has no pool yet (prototype 2625). */
const NEW_POOL_SPLIT = 0.3
export const NEW_POOL_TOAST = 'Started a pool on the left. New water cycles for about 3 weeks.'

type PourState = Pick<StudioState, 'substrates' | 'waterSplit'>
type SiphonState = Pick<StudioState, 'substrates'>

function num(e: WorldEntity, k: string): number {
  const v = e[k]
  return typeof v === 'number' ? v : 0
}

/** Spawns one frame's worth of stream particles (3 for water, 2 otherwise) at the pointer (prototype 2561-2584). */
export function spawnPourStream(
  world: EngineWorld,
  materialId: string,
  rng: Rng = Math.random,
): void {
  const layer = SUBSTRATE_LAYERS.find((l) => l.id === materialId)
  if (!layer || materialId === 'siphon') return
  const count = materialId === 'water' ? 3 : 2
  for (let i = 0; i < count; i++) {
    const isAlt = rng() > 0.45
    world.fallingStreams.push({
      materialId,
      x: Math.max(0.18, Math.min(0.82, world.pointerNorm.x - 0.02 + (rng() - 0.5) * 0.045)),
      y: Math.max(0.12, world.pointerNorm.y + 0.02),
      vx: (rng() - 0.5) * (materialId === 'water' ? 0.0012 : 0.0032),
      vy: 0.004 + rng() * 0.003,
      r: materialId === 'sand' || materialId === 'charcoal' ? 2.2 + rng() * 1.8 : 3.5 + rng() * 3.2,
      rot: rng() * Math.PI,
      color: isAlt ? layer.color : layer.secondaryColor,
    })
  }
}

/** Siphon tool (prototype 3148-3155): drains water first, then scoops the topmost land layer. */
export function siphonStep(world: EngineWorld, state: SiphonState): void {
  const water = effectiveSubstrate(world, state.substrates, 'water')
  if (water > 0) {
    setEffectiveSubstrate(world, state.substrates, 'water', Math.max(0, water - 0.35))
    return
  }
  const top = [...LAND_LAYER_IDS]
    .reverse()
    .find((id) => effectiveSubstrate(world, state.substrates, id) > 0)
  if (top) {
    setEffectiveSubstrate(
      world,
      state.substrates,
      top,
      Math.max(0, effectiveSubstrate(world, state.substrates, top) - 0.25),
    )
  }
  if (world.surfaceGrains.length > 0) world.surfaceGrains.pop()
}

/** Gravity integration and pool-aware landing for falling streams (prototype 2620-2654). */
export function stepPourParticles(
  world: EngineWorld,
  state: PourState,
  dtMs: number,
  rng: Rng = Math.random,
  onToast?: (msg: string) => void,
): void {
  const fs = frameScale(dtMs)
  const hadParticles = world.fallingStreams.length > 0
  for (let i = world.fallingStreams.length - 1; i >= 0; i--) {
    const p = world.fallingStreams[i]
    p.x = num(p, 'x') + num(p, 'vx') * fs
    p.y = num(p, 'y') + num(p, 'vy') * fs
    p.vy = num(p, 'vy') + GRAVITY * fs

    const px = num(p, 'x')
    const mat = String(p.materialId)
    // A pool started earlier this step (pending store flush) already counts.
    const waterSplit = world.pendingWaterSplit ?? state.waterSplit
    const terrain = {
      substrates: effectiveSubstrates(world, state.substrates),
      waterSplit,
      terrainContour: world.terrainContour,
    }
    const inPool = isInPool(px, waterSplit)
    const landingY =
      mat === 'water' && inPool ? getWaterTopNormY(terrain) : getSoilSurfaceNormalizedY(terrain, px)
    if (num(p, 'y') < landingY) continue

    const r = num(p, 'r')
    if (mat === 'water') {
      if (!hasPool(waterSplit)) {
        world.pendingWaterSplit = NEW_POOL_SPLIT
        world.env.cycleProgress = 0
        onToast?.(NEW_POOL_TOAST)
      }
      const before = effectiveSubstrate(world, state.substrates, 'water')
      const next = Math.min(MAX_WATER_MM, before + 0.14)
      setEffectiveSubstrate(world, state.substrates, 'water', next)
      if (before < 1 && next >= 1) world.env.cycleProgress = 0
      // prototype 2633: landings feed the mist boost, which the environment model eases into humidity
      world.env.mistBoost = Math.min(20, world.env.mistBoost + 0.05)
    } else if (inPool) {
      if (mat === 'rivergravel' || mat === 'pebbles') {
        setEffectiveSubstrate(
          world,
          state.substrates,
          'rivergravel',
          Math.min(
            MAX_GRAVEL_MM,
            effectiveSubstrate(world, state.substrates, 'rivergravel') + 0.06,
          ),
        )
      }
      world.surfaceGrains.push({
        x: Math.max(0.16, px),
        yOffset: (rng() - 0.5) * 0.01,
        rx: r * 1.15,
        ry: r * 0.75,
        rot: rng() * Math.PI,
        color: p.color,
      })
    } else {
      setEffectiveSubstrate(
        world,
        state.substrates,
        mat,
        Math.min(MAX_LAND_MM, effectiveSubstrate(world, state.substrates, mat) + 0.08),
      )
      const c = world.terrainContour
      const clampedX = Math.max(CONTOUR_X_MIN, Math.min(CONTOUR_X_MAX, px))
      const cIdx = Math.round(
        ((clampedX - CONTOUR_X_MIN) / (CONTOUR_X_MAX - CONTOUR_X_MIN)) * (c.length - 1),
      )
      if (c[cIdx] !== undefined) {
        c[cIdx] = Math.min(MAX_CONTOUR_MM, c[cIdx] + 0.22)
        if (cIdx > 0) c[cIdx - 1] = Math.min(MAX_CONTOUR_MM, c[cIdx - 1] + 0.11)
        if (cIdx < c.length - 1) c[cIdx + 1] = Math.min(MAX_CONTOUR_MM, c[cIdx + 1] + 0.11)
      }
      world.surfaceGrains.push({
        x: Math.max(0.16, Math.min(0.84, px + (rng() - 0.5) * 0.02)),
        yOffset: (rng() - 0.5) * 0.012,
        rx: r * 1.15,
        ry: r * 0.75,
        rot: rng() * Math.PI,
        color: p.color,
      })
    }
    if (world.surfaceGrains.length > MAX_SURFACE_GRAINS) world.surfaceGrains.shift()
    world.fallingStreams.splice(i, 1)
  }
  if (hadParticles && world.fallingStreams.length === 0 && !world.isPouring)
    world.pourSettled = true
}
