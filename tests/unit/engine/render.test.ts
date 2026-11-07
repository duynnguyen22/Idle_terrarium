import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { VESSELS, VESSELS_BY_ID, type VesselId } from '@/data/vessels'
import { hasPool } from '@/engine/geometry'
import { drawCondensation } from '@/engine/render/condensation'
import { drawLid } from '@/engine/render/frame'
import { computeVesselRect, renderFrame } from '@/engine/render/renderFrame'
import { drawSubstrates } from '@/engine/render/substrates'
import { rippleAmplitude } from '@/engine/render/water'
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
    expect(() => renderFrame(ctx, populatedWorld(), state, R, 1234, { w: 800, h: 600 })).not.toThrow()
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
            renderFrame(ctx, w, { ...state, vessel, lighting, waterSplit }, R, 0, { w: 800, h: 600 }),
          ).not.toThrow()
        }
    const rec = record((ctx) => drawSubstrates(ctx, w, { ...state, waterSplit: 0 }, R, 0, 'water'))
    expect(rec.calls.filter((c) => c.name === 'fill')).toHaveLength(0)
  })

  it('water phase fills the pool when there is one', () => {
    const w = populatedWorld()
    const rec = record((ctx) =>
      drawSubstrates(ctx, w, { ...state, waterSplit: 0.32, substrates: { ...state.substrates, water: 45 } }, R, 0, 'water'),
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

  it('lid is a cork on jars and absent on the tank', () => {
    const w = createWorld()
    expect(
      record((ctx) => drawLid(ctx, w, { ...state, vessel: 'apothecary', hasLid: true }, R, 0))
        .fillStyles.some((f) => /#[0-9a-f]{6}/i.test(String(f))),
    ).toBe(true)
    expect(
      record((ctx) => drawLid(ctx, w, { ...state, vessel: 'paludarium_tank', hasLid: true }, R, 0))
        .calls.filter((c) => c.name === 'fill'),
    ).toHaveLength(0)
  })
})
