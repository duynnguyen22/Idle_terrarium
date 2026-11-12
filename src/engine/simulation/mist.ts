import type { StudioState } from '@/store/studio'
import { getSoilSurfaceNormalizedY } from '../geometry'
import type { EngineWorld } from '../world'
import { frameScale, type Rng } from './constants'
import { effectiveSubstrates } from './telemetry'

/** Particle cap (artifact drawMistSpray keeps the newest 600). */
export const MAX_SPRAY_PARTICLES = 600
/** Bead cap: droplets that landed on a leaf or the soil and slowly evaporate. */
export const MAX_MIST_BEADS = 260
const DROPLETS_PER_FRAME = 7

export interface SprayParticle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  r: number
  /** Fine droplets drift and fade as mist; heavy ones fall and bead where they land. */
  fine: boolean
}

export interface MistBead {
  x: number
  y: number
  r: number
  life: number
}

type MistState = Pick<StudioState, 'substrates' | 'waterSplit'>

/** The nozzle only sprays while the pointer is inside the glass (artifact drawMistSpray `inside`). */
export function pointerInsideGlass(world: EngineWorld): boolean {
  const { x, y } = world.pointerNorm
  return x > 0.15 && x < 0.85 && y > 0.06 && y < 0.92
}

/**
 * One frame of spraying while the trigger is held: a fine downward cone of droplets from the nozzle, and the
 * environment nudge the artifact applies per frame (mist boost, humidity, soil moisture, glass condensation).
 */
export function spraySpawn(world: EngineWorld, dtMs: number, rng: Rng = Math.random): void {
  const fs = frameScale(dtMs)
  const { x: px, y: py } = world.pointerNorm
  const spray = world.sprayParticles as unknown as SprayParticle[]
  for (let i = 0; i < DROPLETS_PER_FRAME; i++) {
    const ang = Math.PI * 0.5 + (rng() - 0.5) * 0.9
    const sp = 0.004 + rng() * 0.005
    spray.push({
      x: px + 0.012,
      y: py + 0.012,
      vx: Math.cos(ang) * sp * 0.55 - 0.0008,
      vy: Math.sin(ang) * sp,
      life: 1,
      r: 0.6 + rng() * 1.5,
      fine: rng() < 0.55,
    })
  }
  if (spray.length > MAX_SPRAY_PARTICLES) spray.splice(0, spray.length - MAX_SPRAY_PARTICLES)

  const env = world.env
  env.mistBoost = Math.min(25, env.mistBoost + 0.18 * fs)
  env.humidity = Math.min(99, env.humidity + 0.06 * fs)
  env.soilMoisture = Math.min(98, env.soilMoisture + 0.035 * fs)
  env.condensation = Math.min(1, env.condensation + 0.0025 * fs)
}

/**
 * Moves spray droplets: fine ones drift and fade, heavy ones fall and bead on the first leaf or the soil they
 * reach (a leaf hit perks the plant's vitality). Beads evaporate slowly. Runs every tick, paused or not, so a
 * release mid-spray still settles.
 */
export function stepMistParticles(
  world: EngineWorld,
  state: MistState,
  dtMs: number,
  rng: Rng = Math.random,
): void {
  const fs = frameScale(dtMs)
  const spray = world.sprayParticles as unknown as SprayParticle[]
  const beads = world.mistBeads as unknown as MistBead[]

  if (spray.length > 0) {
    const terrain = {
      substrates: effectiveSubstrates(world, state.substrates),
      waterSplit: world.pendingWaterSplit ?? state.waterSplit,
      terrainContour: world.terrainContour,
    }
    for (let i = spray.length - 1; i >= 0; i--) {
      const p = spray[i]
      p.x += p.vx * fs
      p.y += p.vy * fs
      if (p.fine) {
        p.vx *= Math.pow(0.96, fs)
        p.vy = p.vy * Math.pow(0.95, fs) + 0.00002 * fs
        p.life -= 0.012 * fs
      } else {
        p.vy += 0.00028 * fs
        p.life -= 0.006 * fs
        const leaf = world.items.find(
          (it) =>
            it.category === 'flora' && Math.hypot(it.x - p.x, it.y - p.y) < 0.06 * (it.scale || 1),
        )
        const ground = getSoilSurfaceNormalizedY(terrain, p.x)
        if (leaf || p.y >= ground) {
          if (leaf) leaf.vitality = Math.min(100, (leaf.vitality ?? 98) + 0.05)
          if (beads.length < MAX_MIST_BEADS)
            beads.push({ x: p.x, y: Math.min(p.y, ground - 0.004), r: 0.9 + rng() * 1.6, life: 1 })
          spray.splice(i, 1)
          continue
        }
      }
      if (p.life <= 0 || p.x < 0.14 || p.x > 0.86) spray.splice(i, 1)
    }
  }

  for (let i = beads.length - 1; i >= 0; i--) {
    beads[i].life -= 0.0016 * fs
    if (beads[i].life <= 0) beads.splice(i, 1)
  }
}

/** Ends a hold-to-mist stroke and returns the release toast (artifact pointerup). */
export function endMist(world: EngineWorld): string {
  world.isMisting = false
  const before = Math.round(world.mistStartHumidity)
  const after = Math.round(world.env.humidity)
  if (world.env.humidity > 95)
    return `Humidity ${after}%. That's plenty; heavy misting invites mold.`
  return after > before ? `Misted: humidity ${before}% → ${after}%` : 'Misted the leaves'
}
