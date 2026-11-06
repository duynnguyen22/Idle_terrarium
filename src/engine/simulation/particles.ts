import type { EngineWorld, WorldEntity } from '../world'
import { frameScale, type Rng } from './constants'

/** initParticlesAndGrains (prototype 729-781). */
export function initWorldParticles(world: EngineWorld, rng: Rng = Math.random): void {
  world.substrateGrains = []
  for (let i = 0; i < 260; i++) {
    world.substrateGrains.push({
      rx: rng(),
      ry: rng(),
      r: 2 + rng() * 5.5,
      shade: rng(),
      angle: rng() * Math.PI,
    })
  }

  world.fireflies = []
  for (let i = 0; i < 16; i++) {
    world.fireflies.push({
      x: 0.22 + rng() * 0.56,
      y: 0.2 + rng() * 0.55,
      vx: (rng() - 0.5) * 0.0002,
      vy: (rng() - 0.5) * 0.00018,
      phase: rng() * Math.PI * 2,
    })
  }

  world.ambientMotes = []
  const types = ['dust', 'spore', 'droplet']
  for (let i = 0; i < 32; i++) {
    const t = types[i % types.length]
    world.ambientMotes.push({
      type: t,
      x: 0.22 + rng() * 0.56,
      y: 0.18 + rng() * 0.58,
      vx: (rng() - 0.5) * 0.00012,
      vy: t === 'droplet' ? 0.0001 : -0.00007,
      r: t === 'spore' ? 1.8 : 1.3,
      phase: rng() * Math.PI * 2,
    })
  }

  world.morningMistClouds = [
    { x: 0.38, y: 0.52, rx: 0.22, ry: 0.06, vx: 0.00008, phase: 0.4 },
    { x: 0.56, y: 0.62, rx: 0.25, ry: 0.07, vx: -0.00007, phase: 2.1 },
    { x: 0.46, y: 0.42, rx: 0.2, ry: 0.05, vx: 0.00006, phase: 4.0 },
  ]

  if (world.mossCarpet.length === 0) {
    for (let i = 0; i < 6; i++) {
      world.mossCarpet.push({ x: 0.25 + i * 0.09, spread: 14 + rng() * 10 })
    }
  }
}

function n(e: WorldEntity, k: string): number {
  const v = e[k]
  return typeof v === 'number' ? v : 0
}

/** Ambient mote drift with vertical wrap (prototype 2621-2626). Runs even while paused. */
export function updateAmbientMotes(world: EngineWorld, dtMs: number): void {
  const fs = frameScale(dtMs)
  for (const m of world.ambientMotes) {
    m.x = n(m, 'x') + n(m, 'vx') * fs
    m.y = n(m, 'y') + n(m, 'vy') * fs
    if (n(m, 'y') < 0.16) m.y = 0.74
    if (n(m, 'y') > 0.76) m.y = 0.18
  }
}

/** Firefly drift and edge bounce (prototype animateLoop 2754-2760); the renderer draws them only at night/twilight. */
export function updateFireflies(world: EngineWorld, dtMs: number): void {
  const fs = frameScale(dtMs)
  for (const f of world.fireflies) {
    f.x = n(f, 'x') + n(f, 'vx') * fs
    f.y = n(f, 'y') + n(f, 'vy') * fs
    if (n(f, 'x') < 0.2 || n(f, 'x') > 0.8) f.vx = n(f, 'vx') * -1
    if (n(f, 'y') < 0.2 || n(f, 'y') > 0.7) f.vy = n(f, 'vy') * -1
  }
}
