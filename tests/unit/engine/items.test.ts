import { describe, expect, it } from 'vitest'
import { DEFAULT_SUBSTRATES } from '@/data/substrates'
import { getSoilSurfaceNormalizedY } from '@/engine/geometry'
import {
  addItem,
  advanceGrowth,
  deleteItem,
  duplicateItem,
  flipItem,
  reorderItem,
  rotateItem,
  scaleItem,
  setFloraStage,
} from '@/engine/items'
import { createWorld } from '@/engine/world'

const surface = getSoilSurfaceNormalizedY(DEFAULT_SUBSTRATES)

describe('addItem', () => {
  it('places mature flora at base scale near the soil surface', () => {
    const w = createWorld()
    const it = addItem(w, 'peacock_fern', 'mature')!
    expect(w.items).toHaveLength(1)
    expect(it.category).toBe('flora')
    expect(it.scale).toBe(1.05)
    expect(it.stage).toBe('mature')
    expect(it.growthProgress).toBe(0.8)
    expect(it.vitality).toBe(98)
    expect(it.y).toBeCloseTo(surface - 0.04)
    expect(it.x).toBeGreaterThanOrEqual(0.36)
    expect(it.x).toBeLessThanOrEqual(0.64)
    expect(it.zIndex).toBe(1)
    expect(it.parentUid).toBeNull()
  })

  it('places sprout flora at 62% scale with 0.2 growth', () => {
    const w = createWorld()
    const it = addItem(w, 'peacock_fern', 'sprout')!
    expect(it.scale).toBeCloseTo(1.05 * 0.62)
    expect(it.stage).toBe('sprout')
    expect(it.growthProgress).toBe(0.2)
  })

  it('ignores stage for fauna and initialises runtime fields', () => {
    const w = createWorld()
    const it = addItem(w, 'cherry_shrimp', 'sprout')!
    expect(it.category).toBe('fauna')
    expect(it.stage).toBe('mature')
    expect(it.vy).toBe(0)
    expect(it.aiState).toBe('wandering')
    expect(it.aiTimer).toBeGreaterThanOrEqual(100)
    expect(it.aiTimer).toBeLessThan(220)
    expect(Math.abs(it.vx ?? 1)).toBeLessThanOrEqual(0.0002)
  })

  it('marks waterfalls, honours explicit position and returns null for unknown ids', () => {
    const w = createWorld()
    expect(addItem(w, 'root_slate_waterfall', 'mature')!.isWaterfall).toBe(true)
    const p = addItem(w, 'peacock_fern', 'mature', { x: 0.3, y: 0.6 })!
    expect([p.x, p.y]).toEqual([0.3, 0.6])
    expect(p.zIndex).toBe(2)
    expect(addItem(w, 'nope', 'mature')).toBeNull()
    expect(w.items).toHaveLength(2)
  })
})

describe('inspector operations', () => {
  const setup = () => {
    const w = createWorld()
    const it = addItem(w, 'peacock_fern', 'mature')!
    return { w, it }
  }

  it('scales by 0.1 within [0.45, 2.2]', () => {
    const { w, it } = setup()
    scaleItem(w, it.uid, 1)
    expect(it.scale).toBeCloseTo(1.15)
    scaleItem(w, it.uid, -1)
    scaleItem(w, it.uid, -1)
    expect(it.scale).toBeCloseTo(0.95)
    for (let i = 0; i < 30; i++) scaleItem(w, it.uid, -1)
    expect(it.scale).toBe(0.45)
    for (let i = 0; i < 40; i++) scaleItem(w, it.uid, 1)
    expect(it.scale).toBe(2.2)
  })

  it('rotates by 15 degrees and flips', () => {
    const { w, it } = setup()
    rotateItem(w, it.uid, 1)
    rotateItem(w, it.uid, 1)
    rotateItem(w, it.uid, -1)
    expect(it.rotation).toBe(15)
    const before = it.flipX
    flipItem(w, it.uid)
    expect(it.flipX).toBe(!before)
  })

  it('reorders zIndex by 1 and never below 0', () => {
    const { w, it } = setup()
    reorderItem(w, it.uid, 1)
    expect(it.zIndex).toBe(2)
    reorderItem(w, it.uid, -1)
    reorderItem(w, it.uid, -1)
    expect(it.zIndex).toBe(0)
    reorderItem(w, it.uid, -1)
    expect(it.zIndex).toBe(0)
  })

  it('advanceGrowth scales by 1.12 capped at 1.65 and sets lush (flora only)', () => {
    const { w, it } = setup()
    advanceGrowth(w, it.uid)
    expect(it.scale).toBeCloseTo(1.05 * 1.12)
    expect(it.stage).toBe('lush')
    advanceGrowth(w, it.uid)
    advanceGrowth(w, it.uid)
    advanceGrowth(w, it.uid)
    expect(it.scale).toBe(1.65)
    const rock = addItem(w, 'dragon_peak', 'mature')!
    advanceGrowth(w, rock.uid)
    expect(rock.stage).toBe('mature')
  })

  it('duplicates 0.05 to the right at the same y as a new item', () => {
    const { w, it } = setup()
    const copy = duplicateItem(w, it.uid, 'mature')!
    expect(w.items).toHaveLength(2)
    expect(copy.uid).not.toBe(it.uid)
    expect(copy.id).toBe(it.id)
    expect(copy.x).toBeCloseTo(it.x + 0.05)
    expect(copy.y).toBe(it.y)
    expect(duplicateItem(w, 'missing', 'mature')).toBeNull()
  })

  it('deletes an item', () => {
    const { w, it } = setup()
    deleteItem(w, it.uid)
    expect(w.items).toHaveLength(0)
  })

  it('setFloraStage converts a flora specimen', () => {
    const { w, it } = setup()
    setFloraStage(w, it.uid, 'sprout')
    expect(it.stage).toBe('sprout')
    expect(it.scale).toBeCloseTo(1.05 * 0.62)
    expect(it.growthProgress).toBe(0.2)
    setFloraStage(w, it.uid, 'mature')
    expect(it.scale).toBe(1.05)
    expect(it.growthProgress).toBe(1)
  })
})
