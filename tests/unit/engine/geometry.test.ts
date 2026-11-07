import { DEFAULT_SUBSTRATES } from '@/data/substrates'
import {
  getSoilSurfaceNormalizedY,
  getTotalSubstrateDepth,
  sampleContour,
  toNormalized,
  traceVesselPath,
} from '@/engine/geometry'

describe('getTotalSubstrateDepth', () => {
  it('sums non-water layers of the default substrates (12+5+34+0+5+6 = 62)', () => {
    expect(getTotalSubstrateDepth(DEFAULT_SUBSTRATES)).toBe(62)
  })
  it('ignores missing keys', () => {
    expect(getTotalSubstrateDepth({ soil: 5, water: 99 })).toBe(5)
  })
})

describe('getSoilSurfaceNormalizedY', () => {
  it('matches the prototype formula for default substrates', () => {
    expect(getSoilSurfaceNormalizedY(DEFAULT_SUBSTRATES)).toBeCloseTo(0.92 - (62 / 130) * 0.42, 10)
  })
  it('is monotonic in depth (more substrate = higher surface = smaller y) and clamped at 0.47', () => {
    const ys = [0, 20, 60, 130, 200, 1000].map((soil) => getSoilSurfaceNormalizedY({ soil }))
    for (let i = 1; i < ys.length; i++) expect(ys[i]).toBeLessThanOrEqual(ys[i - 1])
    expect(ys[0]).toBe(0.92)
    expect(ys[5]).toBeCloseTo(0.47, 10)
  })
  it('subtracts contour height at x', () => {
    const contour = new Array(21).fill(13)
    expect(getSoilSurfaceNormalizedY({}, contour, 0.5)).toBeCloseTo(0.92 - 0.042, 10)
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
