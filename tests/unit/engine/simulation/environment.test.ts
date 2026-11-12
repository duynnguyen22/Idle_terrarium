import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_SUBSTRATES } from '@/data/substrates'
import type { PlacedItem } from '@/data/types'
import { isLampOn } from '@/engine/simulation/clock'
import { frameScale, simSpeedMult } from '@/engine/simulation/constants'
import { computeEnvTargets, updateEnvironment } from '@/engine/simulation/environment'
import { flushEnvSeed } from '@/engine/simulation/telemetry'
import { createStore } from 'jotai'
import { mineralSpotsAtom } from '@/store/studio'
import { createWorld } from '@/engine/world'

const base = {
  airEff: 100,
  tds: 180,
  hasLid: true,
  hasGrowLamp: true,
  hasFogger: true,
  lighting: 'sunlight',
  pumpFlow: 'gentle',
  waterSplit: 0.32,
  substrates: DEFAULT_SUBSTRATES,
  timeSpeed: 1,
} as const

describe('environment model', () => {
  it('createWorld seeds env defaults', () => {
    const w = createWorld()
    expect(w.env).toEqual({
      humidity: 82,
      temperature: 24.5,
      soilMoisture: 74,
      nutrients: 88,
      o2: 96,
      condensation: 0,
      mistBoost: 0,
      cycleProgress: 1,
      bloomTimer: 0,
    })
    expect(w.frame).toBe(0)
    expect(w.careIssues).toEqual([])
    expect(w.pendingWaterSplit).toBeUndefined()
  })
  it('humidity target sums the spec terms', () => {
    const env = { ...createWorld().env, mistBoost: 0 }
    // poolFrac = min(1, 0.32/0.5) * min(1, 45/40) = 0.64; falls absent -> 48+22+7.68+7-3 = 81.68
    expect(computeEnvTargets(base, [], env).humidity).toBeCloseTo(81.68, 2)
    // +4 night, lamp off
    expect(computeEnvTargets({ ...base, lighting: 'night' }, [], env).humidity).toBeCloseTo(
      88.68,
      2,
    )
  })
  it('temperature and o2 targets', () => {
    const env = createWorld().env
    expect(computeEnvTargets(base, [], env).temperature).toBeCloseTo(23 + 2.5 + 0.8 - 0.4, 5)
    const flora = Array.from({ length: 12 }, (_, i) => ({
      uid: String(i),
      id: 'peacock_fern',
      category: 'flora',
    }))
    // capped at 25
    expect(computeEnvTargets(base, flora as PlacedItem[], env).o2).toBeCloseTo(72 + 25, 5)
    expect(computeEnvTargets({ ...base, lighting: 'night' }, [], env).o2).toBeCloseTo(72 - 6, 5)
  })
  it('waterfall with pump adds 3 humidity only when the pool holds water', () => {
    const falls = [{ uid: 'f', id: 'root_slate_waterfall', category: 'hardscape' }] as PlacedItem[]
    const env = { ...createWorld().env, mistBoost: 0 }
    expect(computeEnvTargets(base, falls, env).humidity).toBeCloseTo(84.68, 2)
    expect(computeEnvTargets({ ...base, waterSplit: 0 }, falls, env).humidity).toBeCloseTo(
      48 + 22 + 7 - 3,
      2,
    )
  })
  it('updateEnvironment eases with k = 0.004 * speedMult and decays mistBoost', () => {
    const w = createWorld()
    w.env.humidity = 50
    w.env.mistBoost = 10
    updateEnvironment(w, { ...base, timeSpeed: 5 }, 1000 / 60)
    expect(w.env.mistBoost).toBeCloseTo(10 * (1 - 0.0025 * 3.5), 6)
    expect(w.env.humidity).toBeCloseTo(50 + (Math.min(99, 81.68 + w.env.mistBoost) - 50) * 0.014, 3)
  })
  it('updateEnvironment leaves nutrients and the pool cycle to the per-day rules', () => {
    const w = createWorld()
    w.env.nutrients = 50
    w.env.cycleProgress = 0.5
    w.items = [
      { uid: 'p', id: 'peacock_fern', category: 'flora' },
      { uid: 's', id: 'springtails', category: 'fauna' },
    ] as PlacedItem[]
    for (let i = 0; i < 600; i++) updateEnvironment(w, base, 1000 / 60)
    expect(w.env.nutrients).toBe(50)
    expect(w.env.cycleProgress).toBe(0.5)
  })
  it('isLampOn is false at night', () => {
    expect(isLampOn({ hasGrowLamp: true, lighting: 'night' })).toBe(false)
    expect(isLampOn({ hasGrowLamp: true, lighting: 'twilight' })).toBe(true)
    expect(isLampOn({ hasGrowLamp: false, lighting: 'sunlight' })).toBe(false)
  })
  it('simSpeedMult is 3.5 at 5x, else 1', () => {
    expect(simSpeedMult(5)).toBe(3.5)
    expect(simSpeedMult(1)).toBe(1)
  })
})

describe('room effects on the environment', () => {
  it('createWorld starts with clean glass', () => {
    expect(createWorld().mineralSpots).toBe(0)
  })
  it('O2 target scales with airEff (0.55 + 0.45 * airEff/100)', () => {
    const env = createWorld().env
    const flora = Array.from({ length: 12 }, (_, i) => ({
      uid: String(i),
      id: 'peacock_fern',
      category: 'flora',
    })) as PlacedItem[]
    const clean = computeEnvTargets(base, flora, env).o2
    const foul = computeEnvTargets({ ...base, airEff: 25 }, flora, env).o2
    expect(clean).toBeCloseTo(97, 5)
    expect(foul).toBeCloseTo(72 + 25 * (0.55 + 0.45 * 0.25), 5)
    expect(foul).toBeLessThan(clean)
  })
  it('hard water with the fogger on accrues mineral spots; soft water does not', () => {
    const speed = simSpeedMult(base.timeSpeed) * frameScale(16)
    const hard = createWorld()
    updateEnvironment(hard, { ...base, tds: 500 }, 16)
    expect(hard.mineralSpots).toBeCloseTo(200 * 0.0000004 * speed, 10)
    const soft = createWorld()
    updateEnvironment(soft, { ...base, tds: 180 }, 16)
    expect(soft.mineralSpots).toBe(0)
    const noFog = createWorld()
    updateEnvironment(noFog, { ...base, hasFogger: false, tds: 500 }, 16)
    expect(noFog.mineralSpots).toBe(0)
  })
  it('misting multiplies accrual by 25 and spots cap at 1', () => {
    const speed = simSpeedMult(base.timeSpeed) * frameScale(16)
    const w = createWorld()
    w.isMisting = true
    updateEnvironment(w, { ...base, hasFogger: false, tds: 500 }, 16)
    expect(w.mineralSpots).toBeCloseTo(200 * 0.0000004 * speed * 25, 10)
    w.mineralSpots = 0.99999
    updateEnvironment(w, { ...base, tds: 600 }, 16)
    expect(w.mineralSpots).toBe(1)
  })
  it('flushEnvSeed writes rounded mineral spots only when they changed', () => {
    const w = createWorld()
    w.mineralSpots = 0.123456
    const store = createStore()
    const spotWrites = vi.fn()
    store.sub(mineralSpotsAtom, spotWrites)
    flushEnvSeed(w, store)
    expect(store.get(mineralSpotsAtom)).toBe(0.123)
    expect(spotWrites).toHaveBeenCalledTimes(1)
    flushEnvSeed(w, store)
    expect(spotWrites).toHaveBeenCalledTimes(1)
  })
})
