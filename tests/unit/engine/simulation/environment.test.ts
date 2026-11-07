import { describe, expect, it } from 'vitest'
import { DEFAULT_SUBSTRATES } from '@/data/substrates'
import type { PlacedItem } from '@/data/types'
import { isLampOn } from '@/engine/simulation/clock'
import { simSpeedMult } from '@/engine/simulation/constants'
import { computeEnvTargets, updateEnvironment } from '@/engine/simulation/environment'
import { createWorld } from '@/engine/world'

const base = {
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
  it('nutrients drift by flora and crew, clamped to [15, 100]', () => {
    const w = createWorld()
    w.env.nutrients = 50
    w.items = [
      ...Array.from({ length: 4 }, (_, i) => ({
        uid: `p${i}`,
        id: 'peacock_fern',
        category: 'flora',
      })),
      { uid: 's1', id: 'springtails', category: 'fauna' },
      { uid: 's2', id: 'isopod', category: 'fauna' },
    ] as PlacedItem[]
    updateEnvironment(w, base, 1000 / 60)
    expect(w.env.nutrients).toBeCloseTo(50 - 0.001 + 0.0006, 6)
    w.env.nutrients = 15.0001
    w.items = w.items.filter((i) => i.category === 'flora')
    updateEnvironment(w, base, 1000 / 60)
    expect(w.env.nutrients).toBe(15)
  })
  it('cycleProgress advances only with a pool and fires the toast at 1', () => {
    const w = createWorld()
    w.env.cycleProgress = 0.999999
    const toasts: string[] = []
    updateEnvironment(w, base, 1000 / 60, (m) => toasts.push(m))
    expect(w.env.cycleProgress).toBe(1)
    expect(toasts).toEqual(['The pool has cycled. Ammonia and nitrite read 0.'])
    const w2 = createWorld()
    w2.env.cycleProgress = 0.5
    updateEnvironment(w2, { ...base, waterSplit: 0 }, 16)
    expect(w2.env.cycleProgress).toBe(0.5)
    const w3 = createWorld()
    w3.env.cycleProgress = 0
    updateEnvironment(w3, { ...base, pumpFlow: 'off' }, 1000 / 60)
    expect(w3.env.cycleProgress).toBeCloseTo(0.000004 * 0.4, 9)
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
