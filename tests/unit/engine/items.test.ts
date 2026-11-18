import { beforeEach, describe, expect, it } from 'vitest'
import { decorFootN, FLORA } from '@/data/catalog'
import { DEFAULT_SUBSTRATES } from '@/data/substrates'
import {
  BANK_W,
  getDividerNormX,
  getPoolBedNormY,
  getSoilSurfaceNormalizedY,
  getWaterTopNormY,
} from '@/engine/geometry'
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
  settleDecor,
} from '@/engine/items'
import { createWorld, type EngineWorld } from '@/engine/world'

const terrain = { substrates: DEFAULT_SUBSTRATES, waterSplit: 0.32 }
const fernDef = FLORA.find((f) => f.id === 'peacock_fern')!

describe('addItem', () => {
  let pw: EngineWorld
  beforeEach(() => {
    pw = createWorld()
  })

  it('water fauna are placed mid-water inside the pool', () => {
    const it = addItem(pw, 'cherry_shrimp', 'mature', { terrain, rng: () => 0.5 })!
    const d = getDividerNormX(0.32)
    expect(it.x).toBeGreaterThanOrEqual(0.17)
    expect(it.x).toBeLessThanOrEqual(d - BANK_W - 0.02)
    expect(it.y).toBeCloseTo(
      (getWaterTopNormY(terrain) + getPoolBedNormY(terrain.substrates)) / 2,
      5,
    )
  })

  it('addItem seeds life for a plant in the LIFE table', () => {
    const fit = addItem(pw, 'fittonia', 'mature', { terrain, rng: () => 0.5 })!
    expect(fit.life).toEqual({ cyc: 0.225, n: 0, tendrils: 0 })
    expect(addItem(pw, 'isopod', 'mature', { terrain })!.life).toBeUndefined()
  })

  it('floating flora sit on the water top; land items sit on the surface', () => {
    expect(addItem(pw, 'frogbit_pads', 'mature', { terrain })!.y).toBeCloseTo(
      getWaterTopNormY(terrain),
      5,
    )
    const iso = addItem(pw, 'isopod', 'mature', { terrain, rng: () => 0 })!
    expect(iso.y).toBeCloseTo(getSoilSurfaceNormalizedY(terrain, iso.x) - 0.03, 5)
    const fern = addItem(pw, 'peacock_fern', 'mature', { terrain, rng: () => 0 })!
    expect(fern.y).toBeCloseTo(getSoilSurfaceNormalizedY(terrain, fern.x) - 0.05, 5)
  })

  it('sprouts start at 0.62 scale and 0.2 progress; mature at baseScale, 0.8 and vitality 98', () => {
    const s = addItem(pw, 'peacock_fern', 'sprout', { terrain })!
    expect(s.scale).toBeCloseTo(fernDef.baseScale * 0.62, 5)
    expect(s.growthProgress).toBe(0.2)
    const m = addItem(pw, 'peacock_fern', 'mature', { terrain })!
    expect(m.scale).toBe(fernDef.baseScale)
    expect(m.growthProgress).toBe(0.8)
    expect(m.vitality).toBe(98)
  })

  it('places mature flora at base scale near the soil surface', () => {
    const w = createWorld()
    const it = addItem(w, 'peacock_fern', 'mature', { terrain })!
    expect(w.items).toHaveLength(1)
    expect(it.category).toBe('flora')
    expect(it.scale).toBe(1.05)
    expect(it.stage).toBe('mature')
    expect(it.growthProgress).toBe(0.8)
    expect(it.vitality).toBe(98)
    expect(it.y).toBeCloseTo(getSoilSurfaceNormalizedY(terrain, it.x) - 0.05)
    expect(it.x).toBeGreaterThan(getDividerNormX(0.32))
    expect(it.zIndex).toBe(1)
    expect(it.parentUid).toBeNull()
  })

  it('places sprout flora at 62% scale with 0.2 growth', () => {
    const w = createWorld()
    const it = addItem(w, 'peacock_fern', 'sprout', { terrain })!
    expect(it.scale).toBeCloseTo(1.05 * 0.62)
    expect(it.stage).toBe('sprout')
    expect(it.growthProgress).toBe(0.2)
  })

  it('ignores stage for fauna and initialises runtime fields', () => {
    const w = createWorld()
    const it = addItem(w, 'cherry_shrimp', 'sprout', { terrain })!
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
    expect(addItem(w, 'root_slate_waterfall', 'mature', { terrain })!.isWaterfall).toBe(true)
    const p = addItem(w, 'peacock_fern', 'mature', { terrain, x: 0.3, y: 0.6 })!
    expect([p.x, p.y]).toEqual([0.3, 0.6])
    expect(p.zIndex).toBe(2)
    expect(addItem(w, 'nope', 'mature', { terrain })).toBeNull()
    expect(w.items).toHaveLength(2)
  })
})

describe('inspector operations', () => {
  const setup = () => {
    const w = createWorld()
    const it = addItem(w, 'peacock_fern', 'mature', { terrain })!
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
    const rock = addItem(w, 'dragon_peak', 'mature', { terrain })!
    advanceGrowth(w, rock.uid)
    expect(rock.stage).toBe('mature')
  })

  it('duplicates 0.05 to the right at the same y as a new item', () => {
    const { w, it } = setup()
    const copy = duplicateItem(w, it.uid, 'mature', terrain)!
    expect(w.items).toHaveLength(2)
    expect(copy.uid).not.toBe(it.uid)
    expect(copy.id).toBe(it.id)
    expect(copy.x).toBeCloseTo(it.x + 0.05)
    expect(copy.y).toBe(it.y)
    expect(duplicateItem(w, 'missing', 'mature', terrain)).toBeNull()
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

describe('decor grounding', () => {
  const ground = (x: number) => getSoilSurfaceNormalizedY(terrain, x)
  const decor = (dy: number) => {
    const w = createWorld()
    const it = addItem(w, 'deco_fox', 'mature', { terrain, x: 0.6, y: 0.5 })!
    it.y = ground(it.x) - decorFootN(it.scale) + dy
    return { w, it }
  }

  it('addItem › decor stands its feet on the soil', () => {
    const it = addItem(createWorld(), 'deco_fox', 'mature', { terrain, rng: () => 0.5 })!
    expect(it.scale).toBe(1.15)
    expect(it.y).toBeCloseTo(ground(it.x) - decorFootN(1.15), 5)
  })

  it('settleDecor › drops a piece within 0.035 of the ground onto it', () => {
    const { it } = decor(-0.02)
    settleDecor(it, terrain)
    expect(it.y).toBeCloseTo(ground(it.x) - decorFootN(it.scale), 5)
  })

  it('settleDecor › lifts a piece whose feet are below the ground', () => {
    const { it } = decor(0)
    it.y = ground(it.x)
    settleDecor(it, terrain)
    expect(it.y).toBeCloseTo(ground(it.x) - decorFootN(it.scale), 5)
  })

  it('settleDecor › leaves a piece dropped high in the air', () => {
    const { it } = decor(-0.1)
    const y = it.y
    settleDecor(it, terrain)
    expect(it.y).toBe(y)
  })

  it('settleDecor › leaves mounted decor and non-decor alone', () => {
    const { w, it } = decor(0)
    it.parentUid = 'rock'
    it.y = ground(it.x)
    const fern = addItem(w, 'peacock_fern', 'mature', { terrain, x: 0.6 })!
    fern.y = ground(fern.x)
    settleDecor(it, terrain)
    settleDecor(fern, terrain)
    expect(it.y).toBe(ground(it.x))
    expect(fern.y).toBe(ground(fern.x))
  })

  it('scaleItem › decor on the ground keeps its feet on the ground when resized', () => {
    const { w, it } = decor(0)
    expect(it.scale).toBe(1.15)
    scaleItem(w, it.uid, 1, terrain)
    expect(it.scale).toBeCloseTo(1.25)
    expect(it.y).toBeCloseTo(ground(it.x) - decorFootN(1.25), 5)
  })

  it('scaleItem › mounted decor keeps its y when resized', () => {
    const { w, it } = decor(0)
    it.parentUid = 'rock'
    const y = it.y
    scaleItem(w, it.uid, 1, terrain)
    expect(it.y).toBe(y)
  })
})
