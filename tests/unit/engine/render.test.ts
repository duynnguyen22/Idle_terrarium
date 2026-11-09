import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { VESSELS, VESSELS_BY_ID, vesselKX, type VesselId } from '@/data/vessels'
import { hasPool } from '@/engine/geometry'
import { drawCondensation, drawMineralSpots } from '@/engine/render/condensation'
import { drawLid, drawPaludariumFrontFrame } from '@/engine/render/frame'
import { vesselMetrics } from '@/engine/render/metrics'
import { computeVesselRect, renderFrame } from '@/engine/render/renderFrame'
import { drawSpecimens } from '@/engine/render/specimens'
import { drawSubstrates } from '@/engine/render/substrates'
import { beginVesselClip } from '@/engine/render/vessel'
import { drawWater, rippleAmplitude } from '@/engine/render/water'
import { configureSpriteCache } from '@/engine/sprites/spriteCache'
import { createWorld, type EngineWorld } from '@/engine/world'
import { createDefaultState, type StudioState } from '@/store/useStudioStore'
import type { PlacedItem } from '@/data/types'
import { makeRecordingContext, record } from '../helpers/recordingContext'

const base = { scale: 1, rotation: 0, flipX: false, x: 0.5, y: 0.6 }
const ITEMS: PlacedItem[] = [
  { ...base, uid: 'a', id: 'peacock_fern', category: 'flora', zIndex: 3, stage: 'lush' },
  {
    ...base,
    uid: 'b',
    id: 'root_slate_waterfall',
    category: 'hardscape',
    zIndex: 1,
    isWaterfall: true,
  },
  { ...base, uid: 'c', id: 'medaka_fish', category: 'fauna', zIndex: 2 },
]

function populatedWorld(): EngineWorld {
  const world = createWorld()
  world.items = structuredClone(ITEMS)
  world.terrainContour = world.terrainContour.map((_, i) => Math.sin(i * 0.45) * 2.5)
  world.substrateGrains = [{ rx: 0.4, ry: 0.5, shade: 0.9, r: 3, angle: 0.2 }]
  world.surfaceGrains = [{ x: 0.5, yOffset: 0, rx: 3, ry: 2, rot: 0, color: '#d4a359' }]
  world.mossCarpet = [{ x: 0.4, spread: 20 }]
  world.moldPatches = [{ x: 0.6, size: 10 }]
  world.ambientMotes = [{ x: 0.3, y: 0.3, r: 2, type: 'spore' }]
  world.fireflies = [{ x: 0.4, y: 0.4 }]
  world.fallingStreams = [
    { x: 0.5, y: 0.2, vx: 0.001, materialId: 'water' },
    { x: 0.5, y: 0.2, vx: 0, materialId: 'soil', r: 2, rot: 0, color: '#543b2a' },
  ]
  return world
}

/** Vessel clip, plus (with a pool) the land-strata bank cut and the pool gravel-bed clip. */
const expectedClips = (s: StudioState) => 1 + (hasPool(s.waterSplit) ? 2 : 0)

beforeEach(() => {
  configureSpriteCache(
    () => ({ width: 0, height: 0, getContext: () => null }) as unknown as HTMLCanvasElement,
  )
})
afterEach(() => configureSpriteCache())

describe('computeVesselRect', () => {
  it('follows getStageGeometry', () => {
    expect(computeVesselRect(1000, 600, false).w / 2).toBeCloseTo(276, 0)
    expect(computeVesselRect(1000, 600, true).w / 2).toBeCloseTo(288, 0)
  })
})

describe('renderFrame', () => {
  it('draws one of each item category: vessel (+ pool) clips, one drawImage per item', () => {
    const { ctx, calls } = makeRecordingContext()
    const R = computeVesselRect(800, 600)
    const state = createDefaultState()
    expect(() =>
      renderFrame(ctx, populatedWorld(), state, R, 1234, { w: 800, h: 600 }),
    ).not.toThrow()
    expect(calls.filter((c) => c === 'clip')).toHaveLength(expectedClips(state))
    expect(calls.filter((c) => c === 'drawImage')).toHaveLength(ITEMS.length)
    expect(calls.filter((c) => c === 'save')).toHaveLength(
      calls.filter((c) => c === 'restore').length,
    )
  })

  it.each(VESSELS.map((v) => v.id))('renders every lighting phase on %s', (vessel) => {
    for (const lighting of ['dawn', 'sunlight', 'twilight', 'night'] as const) {
      const { ctx, calls } = makeRecordingContext()
      const state: StudioState = { ...createDefaultState(), vessel, lighting, selectedId: 'a' }
      expect(() =>
        renderFrame(ctx, populatedWorld(), state, computeVesselRect(500, 700), 99),
      ).not.toThrow()
      expect(calls.filter((c) => c === 'clip')).toHaveLength(expectedClips(state))
    }
  })

  it('draws the pour cursor only while the pour tool is active', () => {
    const state: StudioState = {
      ...createDefaultState(),
      activeTool: 'pour',
      activePourMaterial: 'soil',
    }
    const idle = makeRecordingContext()
    renderFrame(idle.ctx, createWorld(), createDefaultState(), computeVesselRect(800, 600), 0)
    const pouring = makeRecordingContext()
    renderFrame(pouring.ctx, createWorld(), state, computeVesselRect(800, 600), 0)
    expect(pouring.calls.filter((c) => c === 'roundRect').length).toBeGreaterThan(
      idle.calls.filter((c) => c === 'roundRect').length,
    )
  })
})

describe('reduced motion', () => {
  const rotations = (reducedMotion: boolean, timestamp: number) => {
    const { ctx } = makeRecordingContext()
    const angles: number[] = []
    ;(ctx as unknown as { rotate: (a: number) => void }).rotate = (a) => void angles.push(a)
    const state: StudioState = { ...createDefaultState(), reducedMotion }
    renderFrame(ctx, populatedWorld(), state, computeVesselRect(800, 600), timestamp)
    return angles
  }

  it('sways flora over time by default', () => {
    expect(rotations(false, 0)).not.toEqual(rotations(false, 1500))
  })

  it('holds flora still when reducedMotion is set', () => {
    expect(rotations(true, 0)).toEqual(rotations(true, 1500))
  })

  it('scales the waterfall cascade with the pump: 0, 7 or 13 streams', () => {
    const strokes = (pumpFlow: StudioState['pumpFlow']) => {
      const { ctx, calls } = makeRecordingContext()
      const world = createWorld()
      world.items = structuredClone(ITEMS.filter((i) => i.id === 'root_slate_waterfall'))
      const state: StudioState = { ...createDefaultState(), pumpFlow, hasFogger: false }
      drawSpecimens(ctx, world, state, computeVesselRect(800, 600), 500)
      return calls.filter((c) => c === 'stroke').length
    }
    const off = strokes('off')
    expect(strokes('gentle') - off).toBe(7)
    expect(strokes('strong') - off).toBe(13)
  })

  it('draws thicker, faster cascade streams on strong flow', () => {
    const widths = (pumpFlow: StudioState['pumpFlow']) => {
      const log: number[] = []
      const { ctx } = makeRecordingContext()
      Object.defineProperty(ctx, 'lineWidth', {
        set: (v: number) => void log.push(v),
        get: () => 1,
      })
      const world = createWorld()
      world.items = structuredClone(ITEMS.filter((i) => i.id === 'root_slate_waterfall'))
      const state: StudioState = { ...createDefaultState(), pumpFlow, hasFogger: false }
      drawSpecimens(ctx, world, state, computeVesselRect(800, 600), 500)
      return log
    }
    expect(widths('gentle')).toContain(2.2)
    expect(widths('gentle')).not.toContain(3.2)
    expect(widths('strong')).toContain(3.2)
  })

  it('keeps the pool surface flat when reducedMotion is set', () => {
    const surfaceYs = (reducedMotion: boolean, timestamp: number) => {
      const { ctx } = makeRecordingContext()
      const ys: number[] = []
      ;(ctx as unknown as { lineTo: (x: number, y: number) => void }).lineTo = (_x, y) =>
        void ys.push(y)
      const state: StudioState = { ...createDefaultState(), pumpFlow: 'strong', reducedMotion }
      drawWater(ctx, populatedWorld(), state, computeVesselRect(800, 600), timestamp)
      return ys
    }
    expect(surfaceYs(false, 0)).not.toEqual(surfaceYs(false, 1500))
    const still = surfaceYs(true, 0)
    expect(still.length).toBeGreaterThan(4)
    expect(still).toEqual(surfaceYs(true, 1500))
    // The meniscus vertices before the bank all sit on one flat water line.
    expect(new Set(still.slice(0, 4)).size).toBe(1)
  })
})

describe('computeVesselRect', () => {
  it('is square and centred on the canvas', () => {
    const R = computeVesselRect(1000, 600)
    expect(R.w).toBe(R.h)
    expect(R.w).toBeCloseTo(600 * 0.46 * 2)
    expect(R.x + R.w / 2).toBeCloseTo(500)
    expect(R.y + R.h / 2).toBeCloseTo(300)
  })

  it('fits the shorter canvas side and widens in relax mode', () => {
    expect(computeVesselRect(400, 900).w).toBeCloseTo(400 * 0.62 * 2)
    expect(computeVesselRect(400, 900, true).w).toBeCloseTo(400 * 0.62 * 2)
    expect(computeVesselRect(1000, 600, true).w).toBeGreaterThan(computeVesselRect(1000, 600).w)
  })

  it('scales the vessel rect horizontally by kx and keeps the radius from the height', () => {
    const R = computeVesselRect(1000, 600, false, 2)
    expect(R.h / 2).toBeCloseTo(276, 0)
    expect(R.w).toBeCloseTo(R.h * 2)
    expect(R.x + R.w / 2).toBeCloseTo(500)
    expect(vesselMetrics(R)).toMatchObject({ r: R.h / 2, kx: 2 })
  })

  it('fits a 2.6 tank inside a narrow canvas', () => {
    const R = computeVesselRect(400, 900, false, 2.6)
    expect(R.w * 0.72).toBeLessThanOrEqual(400)
    expect(R.w / R.h).toBeCloseTo(2.6)
  })
})

describe('v6 pool, hardware and glass', () => {
  const R = computeVesselRect(800, 600)
  const state: StudioState = createDefaultState()

  it('ripple amplitude follows the pump', () => {
    expect([rippleAmplitude('strong'), rippleAmplitude('gentle'), rippleAmplitude('off')]).toEqual([
      2.8, 1.5, 0.4,
    ])
  })

  it('renders with and without a pool for every vessel and lighting without throwing', () => {
    const w = populatedWorld()
    for (const vessel of Object.keys(VESSELS_BY_ID) as VesselId[])
      for (const lighting of ['sunlight', 'twilight', 'night'] as const)
        for (const waterSplit of [0.32, 0]) {
          const { ctx } = makeRecordingContext()
          expect(() =>
            renderFrame(ctx, w, { ...state, vessel, lighting, waterSplit }, R, 0, {
              w: 800,
              h: 600,
            }),
          ).not.toThrow()
        }
    const rec = record((ctx) => drawSubstrates(ctx, w, { ...state, waterSplit: 0 }, R, 0, 'water'))
    expect(rec.calls.filter((c) => c.name === 'fill')).toHaveLength(0)
  })

  it('water phase fills the pool when there is one', () => {
    const w = populatedWorld()
    const rec = record((ctx) =>
      drawSubstrates(
        ctx,
        w,
        { ...state, waterSplit: 0.32, substrates: { ...state.substrates, water: 45 } },
        R,
        0,
        'water',
      ),
    )
    expect(rec.calls.filter((c) => c.name === 'fill').length).toBeGreaterThan(0)
  })

  it('condensation draws nothing below 0.18 and something above', () => {
    const w = createWorld()
    w.env.condensation = 0.1
    expect(
      record((ctx) => drawCondensation(ctx, w, state, R, 0)).calls.filter((c) => c.name === 'arc'),
    ).toHaveLength(0)
    w.env.condensation = 0.6
    expect(
      record((ctx) => drawCondensation(ctx, w, state, R, 0)).calls.filter((c) => c.name === 'arc')
        .length,
    ).toBeGreaterThan(0)
  })

  it('draws mineral spots only above 0.03 and never on the globe', () => {
    const ellipses = (world: EngineWorld, vessel: VesselId = 'paludarium_tank') =>
      record((ctx) => drawMineralSpots(ctx, world, { ...state, vessel }, R, 0)).calls.filter(
        (c) => c.name === 'ellipse',
      ).length
    const w = createWorld()
    w.mineralSpots = 0.03
    expect(ellipses(w)).toBe(0)
    w.mineralSpots = 0.5
    expect(ellipses(w)).toBeGreaterThan(0)
    expect(ellipses(w, 'globe')).toBe(0)
    const more = createWorld()
    more.mineralSpots = 1
    expect(ellipses(more)).toBeGreaterThan(ellipses(w))
    const ellipseArgs = () => {
      const args: unknown[][] = []
      const { ctx } = makeRecordingContext()
      const spy = new Proxy(ctx, {
        get: (target, prop) =>
          prop === 'ellipse' ? (...a: unknown[]) => void args.push(a) : Reflect.get(target, prop),
      })
      drawMineralSpots(spy, w, { ...state, vessel: 'paludarium_tank' }, R, 0)
      return args
    }
    const first = ellipseArgs()
    expect(first.length).toBeGreaterThan(0)
    expect(ellipseArgs()).toEqual(first)
  })

  it('lid is a cork on jars and absent on the tank', () => {
    const w = createWorld()
    expect(
      record((ctx) =>
        drawLid(ctx, w, { ...state, vessel: 'apothecary', hasLid: true }, R, 0),
      ).fillStyles.some((f) => /#[0-9a-f]{6}/i.test(String(f))),
    ).toBe(true)
    expect(
      record((ctx) =>
        drawLid(ctx, w, { ...state, vessel: 'paludarium_tank', hasLid: true }, R, 0),
      ).calls.filter((c) => c.name === 'fill'),
    ).toHaveLength(0)
  })
})

/** Context stub that logs every call with its arguments and the lineWidth in force at that call. */
function argsContext() {
  const calls: { name: string; args: number[]; lineWidth: unknown }[] = []
  const state: Record<string, unknown> = {}
  const gradient = { addColorStop: () => undefined }
  const ctx = new Proxy(state, {
    get(target, prop: string) {
      if (prop in target) return target[prop]
      return (...args: number[]) => {
        calls.push({ name: prop, args, lineWidth: target.lineWidth })
        return prop.startsWith('create') ? gradient : undefined
      }
    },
    set(target, prop: string, value) {
      target[prop] = value
      return true
    },
  }) as unknown as CanvasRenderingContext2D
  return { ctx, calls }
}

describe('rectangular tanks', () => {
  it('renderFrame draws every vessel with a populated world', () => {
    for (const v of VESSELS) {
      const state = { ...createDefaultState(), vessel: v.id, hasLid: true, hasGrowLamp: true }
      const R = computeVesselRect(800, 600, false, vesselKX(v.id))
      expect(() =>
        renderFrame(makeRecordingContext().ctx, populatedWorld(), state, R, 50),
      ).not.toThrow()
    }
  })

  it('no lid on rect tanks', () => {
    const R = computeVesselRect(800, 600, false, 2)
    const roundRects = (vessel: VesselId) => {
      const { ctx, calls } = argsContext()
      drawLid(ctx, createWorld(), { ...createDefaultState(), vessel, hasLid: true }, R, 0)
      return calls.filter((c) => c.name === 'roundRect')
    }
    expect(roundRects('rimless_landscape')).toHaveLength(0)
    expect(roundRects('apothecary')).toHaveLength(1)
  })

  it('vivarium frame draws doors', () => {
    const R = computeVesselRect(800, 600, false, 1.55)
    const { r } = vesselMetrics(R)
    const { ctx, calls } = argsContext()
    const state = { ...createDefaultState(), vessel: 'vivarium_front' as VesselId }
    drawPaludariumFrontFrame(ctx, createWorld(), state, R, 0)
    const frames = calls.filter((c) => c.name === 'strokeRect')
    expect(frames).toHaveLength(1)
    expect(frames[0].args[2]).toBeCloseTo(r * 1.44 * 1.55)
    expect(frames[0].lineWidth).toBe(5)
    const handles = calls.filter((c) => c.name === 'roundRect')
    expect(handles).toHaveLength(2)
    for (const h of handles) expect(h.args.slice(2, 4)).toEqual([4, 16])
  })

  it('paludarium frame strokes a 4.5 black frame and a full-width water dam', () => {
    const R = computeVesselRect(800, 600, false, vesselKX('paludarium_tank'))
    const { r, kx } = vesselMetrics(R)
    const { ctx, calls } = argsContext()
    const state = { ...createDefaultState(), vessel: 'paludarium_tank' as VesselId }
    drawPaludariumFrontFrame(ctx, createWorld(), state, R, 0)
    const frames = calls.filter((c) => c.name === 'strokeRect')
    expect(frames).toHaveLength(1)
    expect(frames[0].lineWidth).toBe(4.5)
    expect(frames[0].args[2]).toBeCloseTo(r * 1.44 * kx)
    const dams = calls.filter((c) => c.name === 'fillRect' && c.args[3] === 5.5)
    expect(dams).toHaveLength(1)
    expect(dams[0].args[2]).toBeCloseTo(r * 1.44 * kx)
  })

  it('riparium frame draws the hanging planter rail; rimless does not', () => {
    const rails = (vessel: VesselId) => {
      const R = computeVesselRect(800, 600, false, vesselKX(vessel))
      const { cx, cy, r, kx } = vesselMetrics(R)
      const w = r * 1.44 * kx
      const { ctx, calls } = argsContext()
      drawPaludariumFrontFrame(ctx, createWorld(), { ...createDefaultState(), vessel }, R, 0)
      const leftX = cx - w / 2
      const topY = cy - r * 0.84
      const rail = calls.filter((c) => c.name === 'fillRect' && c.args[3] === 4)
      return { rail, expected: [leftX + 6, topY + 4, w - 12, 4] }
    }
    const rip = rails('riparium_long')
    expect(rip.rail).toHaveLength(1)
    rip.rail[0].args.forEach((a, i) => expect(a).toBeCloseTo(rip.expected[i]))
    expect(rails('rimless_landscape').rail).toHaveLength(0)
  })

  it('places a specimen across the full scaled width', () => {
    const R = computeVesselRect(800, 600, false, 2)
    const world = createWorld()
    world.items = [{ ...structuredClone(ITEMS[0]), x: 1, y: 0.5 }]
    const { ctx, calls } = argsContext()
    drawSpecimens(ctx, world, createDefaultState(), R, 0)
    const moves = calls.filter((c) => c.name === 'translate')
    expect(moves[0].args[0]).toBeCloseTo(R.x + R.w)
    expect(moves[0].args[1]).toBeCloseTo(R.y + R.h / 2)
  })

  it('fills the inner glass tint over the whole scaled rect', () => {
    const R = computeVesselRect(800, 600, false, 2.6)
    const { ctx, calls } = argsContext()
    beginVesselClip(ctx, createWorld(), { ...createDefaultState(), vessel: 'riparium_long' }, R, 0)
    const fill = calls.find((c) => c.name === 'fillRect')
    expect(fill?.args[0]).toBeCloseTo(R.x)
    expect(fill?.args[1]).toBeCloseTo(R.y)
    expect(fill?.args[2]).toBeCloseTo(R.w)
    expect(fill?.args[3]).toBeCloseTo(R.h)
  })
})
