import { DEFAULT_SUBSTRATES } from '@/data/substrates'
import {
  BANK_W,
  MM_TO_NORM,
  getDividerNormX,
  getLandSurfaceNormY,
  getPoolBedNormY,
  getWaterTopNormY,
  hasPool,
  poolHasWater,
  randomLandX,
  getSoilSurfaceNormalizedY,
  getTotalSubstrateDepth,
  sampleContour,
  toNormalized,
  traceVesselPath,
} from '@/engine/geometry'

describe('getTotalSubstrateDepth', () => {
  it('sums non-water layers of the default substrates (12+5+34+0+5 = 56; river gravel excluded)', () => {
    expect(getTotalSubstrateDepth(DEFAULT_SUBSTRATES)).toBe(56)
  })
  it('ignores missing keys', () => {
    expect(getTotalSubstrateDepth({ soil: 5, water: 99 })).toBe(5)
  })
})

describe('getSoilSurfaceNormalizedY', () => {
  it('matches the prototype formula for default substrates', () => {
    expect(getSoilSurfaceNormalizedY({ substrates: DEFAULT_SUBSTRATES, waterSplit: 0 })).toBeCloseTo(0.92 - (56 / 130) * 0.42, 10)
  })
  it('is monotonic in depth (more substrate = higher surface = smaller y)', () => {
    const ys = [0, 20, 60, 130, 200, 1000].map((soil) => getSoilSurfaceNormalizedY({ substrates: { soil }, waterSplit: 0 }))
    for (let i = 1; i < ys.length; i++) expect(ys[i]).toBeLessThanOrEqual(ys[i - 1])
    expect(ys[0]).toBe(0.92)
  })
  it('subtracts contour height at x', () => {
    const contour = new Array(21).fill(13)
    expect(getSoilSurfaceNormalizedY({ substrates: {}, waterSplit: 0, terrainContour: contour }, 0.5)).toBeCloseTo(0.92 - 0.042, 10)
  })
})

describe('sampleContour', () => {
  const c = Array.from({ length: 21 }, (_, i) => i)
  it('interpolates between neighbours', () => {
    expect(sampleContour(c, 0.5)).toBeCloseTo(10, 10)
    expect(sampleContour(c, 0.15 + 0.7 * (0.5 / 20))).toBeCloseTo(0.5, 10)
  })
  it('clamps at the ends', () => {
    expect(sampleContour(c, -1)).toBe(0)
    expect(sampleContour(c, 2)).toBe(20)
  })
})

describe('toNormalized', () => {
  it('round-trips a point', () => {
    const R = { x: 40, y: 20, w: 300, h: 300 }
    const rect = { left: 10, top: 5 }
    const nx = 0.3
    const ny = 0.8
    const out = toNormalized(rect.left + R.x + nx * R.w, rect.top + R.y + ny * R.h, rect, R)
    expect(out.nx).toBeCloseTo(nx, 10)
    expect(out.ny).toBeCloseTo(ny, 10)
  })
})

describe('traceVesselPath', () => {
  const R = { x: 0, y: 0, w: 200, h: 200 }
  it.each(['paludarium_tank', 'apothecary', 'wardian', 'globe', 'cylinder', 'teardrop'])(
    'begins a path for %s',
    (vessel) => {
      const ctx = {
        beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), bezierCurveTo: vi.fn(),
        closePath: vi.fn(), arc: vi.fn(), roundRect: vi.fn(),
      } as unknown as CanvasRenderingContext2D
      traceVesselPath(ctx, vessel, R)
      expect(ctx.beginPath).toHaveBeenCalledTimes(1)
    },
  )
  it('globe uses radius 0.86R about the centre', () => {
    const arc = vi.fn()
    traceVesselPath({ beginPath: vi.fn(), arc } as unknown as CanvasRenderingContext2D, 'globe', R)
    expect(arc).toHaveBeenCalledWith(100, 100, 86, 0, Math.PI * 2)
  })
})

describe('v6 pool geometry', () => {
  const t = { substrates: { pebbles: 12, charcoal: 5, soil: 34, sand: 0, leaflitter: 5, rivergravel: 6, water: 45 }, waterSplit: 0.32 }
  it('divider and bed follow the spec', () => {
    expect(getDividerNormX(0.32)).toBeCloseTo(0.374, 3)
    expect(getDividerNormX(0.9)).toBeCloseTo(0.57, 3)
    expect(getPoolBedNormY(t.substrates)).toBeCloseTo(0.92 - 6 * MM_TO_NORM, 5)
    expect(getPoolBedNormY({ rivergravel: 0 })).toBeCloseTo(0.92 - 2 * MM_TO_NORM, 5)
  })
  it('surface is bed in the pool, land on land, sloped on the bank', () => {
    const d = getDividerNormX(0.32)
    expect(getSoilSurfaceNormalizedY(t, 0.2)).toBeCloseTo(getPoolBedNormY(t.substrates), 5)
    expect(getSoilSurfaceNormalizedY(t, 0.7)).toBeCloseTo(getLandSurfaceNormY(t, 0.7), 5)
    const mid = getSoilSurfaceNormalizedY(t, d - BANK_W / 2)
    expect(mid).toBeGreaterThan(getLandSurfaceNormY(t, d))
    expect(mid).toBeLessThan(getPoolBedNormY(t.substrates))
  })
  it('water top is clamped to the bank lip (brief literal used water 1, which the Math.max spec formula cannot satisfy)', () => {
    const lip = getLandSurfaceNormY(t, getDividerNormX(0.32)) + 0.015
    expect(getWaterTopNormY({ ...t, substrates: { ...t.substrates, water: 80 } })).toBeCloseTo(lip, 5)
    expect(getWaterTopNormY({ ...t, substrates: { ...t.substrates, water: 1 } })).toBeCloseTo(getPoolBedNormY(t.substrates) - MM_TO_NORM, 5)
  })
  it('waterSplit 0 with water > 0 is all land and finite', () => {
    const noPool = { ...t, waterSplit: 0 }
    expect(hasPool(0)).toBe(false)
    expect(poolHasWater(noPool)).toBe(false)
    for (const x of [0.15, 0.2, 0.5, 0.85]) expect(Number.isFinite(getSoilSurfaceNormalizedY(noPool, x))).toBe(true)
    expect(getSoilSurfaceNormalizedY(noPool, 0.2)).toBeCloseTo(getLandSurfaceNormY(noPool, 0.2), 5)
  })
  it('total depth ignores water and gravel', () => {
    expect(getTotalSubstrateDepth(t.substrates)).toBe(56)
  })
  it('randomLandX stays right of the bank when a pool exists', () => {
    expect(randomLandX(t, () => 0)).toBeCloseTo(getDividerNormX(0.32) + 0.03, 5)
    expect(randomLandX(t, () => 0.999)).toBeLessThanOrEqual(0.76)
    expect(randomLandX({ ...t, waterSplit: 0 }, () => 0)).toBeCloseTo(0.24, 5)
  })
})
