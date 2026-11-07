import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_SUBSTRATES } from '@/data/substrates'
import { addItem } from '@/engine/items'
import {
  endMist,
  MAX_SPRAY_PARTICLES,
  pointerInsideGlass,
  spraySpawn,
  stepMistParticles,
  type MistBead,
  type SprayParticle,
} from '@/engine/simulation/mist'
import { FRAME_MS } from '@/engine/simulation/constants'
import { createWorld, type EngineWorld } from '@/engine/world'

const state = { substrates: DEFAULT_SUBSTRATES, waterSplit: 0.32 }
let world: EngineWorld
beforeEach(() => {
  world = createWorld()
  world.pointerNorm = { x: 0.6, y: 0.3 }
})

const spray = () => world.sprayParticles as unknown as SprayParticle[]
const beads = () => world.mistBeads as unknown as MistBead[]

describe('mist spray', () => {
  it('only sprays with the pointer inside the glass', () => {
    expect(pointerInsideGlass(world)).toBe(true)
    world.pointerNorm = { x: 0.1, y: 0.3 }
    expect(pointerInsideGlass(world)).toBe(false)
  })

  it('emits 7 droplets per frame and nudges the environment, all capped', () => {
    world.env.humidity = 98.98
    world.env.mistBoost = 24.9
    spraySpawn(world, FRAME_MS)
    expect(spray()).toHaveLength(7)
    expect(world.env.humidity).toBe(99)
    expect(world.env.mistBoost).toBe(25)
    for (let i = 0; i < 100; i++) spraySpawn(world, FRAME_MS)
    expect(spray()).toHaveLength(MAX_SPRAY_PARTICLES)
  })

  it('heavy droplets fall and bead on the soil; beads evaporate', () => {
    spray().push({ x: 0.6, y: 0.3, vx: 0, vy: 0.01, life: 1, r: 1, fine: false })
    for (let i = 0; i < 200 && spray().length; i++) stepMistParticles(world, state, FRAME_MS)
    expect(spray()).toHaveLength(0)
    expect(beads()).toHaveLength(1)
    for (let i = 0; i < 700; i++) stepMistParticles(world, state, FRAME_MS)
    expect(beads()).toHaveLength(0)
  })

  it('a droplet hitting a plant beads on it and perks its vitality', () => {
    const fern = addItem(world, 'peacock_fern', 'mature', { terrain: state, x: 0.6, y: 0.5 })!
    fern.vitality = 90
    spray().push({ x: fern.x, y: fern.y - 0.02, vx: 0, vy: 0.001, life: 1, r: 1, fine: false })
    stepMistParticles(world, state, FRAME_MS)
    expect(fern.vitality).toBeCloseTo(90.05)
    expect(beads()).toHaveLength(1)
  })

  it('fine droplets drift and fade without beading', () => {
    spray().push({ x: 0.6, y: 0.3, vx: 0, vy: 0.001, life: 1, r: 1, fine: true })
    for (let i = 0; i < 100; i++) stepMistParticles(world, state, FRAME_MS)
    expect(spray()).toHaveLength(0)
    expect(beads()).toHaveLength(0)
  })

  it('the release toast reports the humidity change, or warns when it is very high', () => {
    world.isMisting = true
    world.mistStartHumidity = 70
    world.env.humidity = 76
    expect(endMist(world)).toBe('Misted: humidity 70% → 76%')
    expect(world.isMisting).toBe(false)
    world.env.humidity = 70.2
    expect(endMist(world)).toBe('Misted the leaves')
    world.env.humidity = 97
    expect(endMist(world)).toMatch(/heavy misting invites mold/)
  })
})
