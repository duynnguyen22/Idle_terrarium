import { SUBSTRATE_LAYERS } from '@/data/substrates'
import type { StudioState } from '@/store/useStudioStore'
import { CONTOUR_X_MAX, CONTOUR_X_MIN, getSoilSurfaceNormalizedY } from '../geometry'
import type { EngineWorld, WorldEntity } from '../world'
import { frameScale, type Rng } from './constants'
import {
  bumpTelemetry,
  effectiveSubstrate,
  effectiveSubstrates,
  setEffectiveSubstrate,
} from './telemetry'

export const GRAVITY = 0.00085
const MAX_SURFACE_GRAINS = 220
const MAX_DEPTH_MM = 45
const MAX_CONTOUR_MM = 18

type PourState = Pick<StudioState, 'substrates' | 'telemetry' | 'waterSplit'>

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

/** Siphon tool (prototype 2549-2560): drains water first, then scoops the topmost substrate layer. */
export function siphonStep(world: EngineWorld, state: PourState): void {
  const water = effectiveSubstrate(world, state.substrates, 'water')
  if (water > 0) {
    setEffectiveSubstrate(world, state.substrates, 'water', Math.max(0, water - 0.35))
    return
  }
  const rev = [...SUBSTRATE_LAYERS]
    .reverse()
    .find(
      (l) =>
        l.id !== 'water' &&
        l.id !== 'siphon' &&
        effectiveSubstrate(world, state.substrates, l.id) > 0,
    )
  if (rev) {
    setEffectiveSubstrate(
      world,
      state.substrates,
      rev.id,
      Math.max(0, effectiveSubstrate(world, state.substrates, rev.id) - 0.25),
    )
  }
  if (world.surfaceGrains.length > 0) world.surfaceGrains.pop()
}

/** Gravity integration and landing for falling streams (prototype 2242-2332). */
export function stepPourParticles(
  world: EngineWorld,
  state: PourState,
  dtMs: number,
  rng: Rng = Math.random,
): void {
  const fs = frameScale(dtMs)
  const hadParticles = world.fallingStreams.length > 0
  for (let i = world.fallingStreams.length - 1; i >= 0; i--) {
    const p = world.fallingStreams[i]
    p.x = num(p, 'x') + num(p, 'vx') * fs
    p.y = num(p, 'y') + num(p, 'vy') * fs
    p.vy = num(p, 'vy') + GRAVITY * fs

    const px = num(p, 'x')
    const surface = getSoilSurfaceNormalizedY(
      {
        substrates: effectiveSubstrates(world, state.substrates),
        waterSplit: state.waterSplit,
        terrainContour: world.terrainContour,
      },
      px,
    )
    if (num(p, 'y') < surface) continue

    const mat = String(p.materialId)
    if (mat === 'water') {
      setEffectiveSubstrate(
        world,
        state.substrates,
        'water',
        Math.min(MAX_DEPTH_MM, effectiveSubstrate(world, state.substrates, 'water') + 0.14),
      )
      bumpTelemetry(world, state.telemetry, 'humidity', 0.08)
      bumpTelemetry(world, state.telemetry, 'soilMoisture', 0.12)
    } else {
      setEffectiveSubstrate(
        world,
        state.substrates,
        mat,
        Math.min(MAX_DEPTH_MM, effectiveSubstrate(world, state.substrates, mat) + 0.08),
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
      const r = num(p, 'r')
      world.surfaceGrains.push({
        x: Math.max(0.16, Math.min(0.84, px + (rng() - 0.5) * 0.02)),
        yOffset: (rng() - 0.5) * 0.012,
        rx: r * 1.15,
        ry: r * 0.75,
        rot: rng() * Math.PI,
        color: p.color,
      })
      if (world.surfaceGrains.length > MAX_SURFACE_GRAINS) world.surfaceGrains.shift()
    }
    world.fallingStreams.splice(i, 1)
  }
  if (hadParticles && world.fallingStreams.length === 0 && !world.isPouring)
    world.pourSettled = true
}
