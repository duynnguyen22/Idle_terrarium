import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { SUBSTRATE_LAYERS } from '@/data/substrates'
import { VESSELS } from '@/data/vessels'
import { computeVesselRect, renderFrame } from '@/engine/render/renderFrame'
import { configureSpriteCache } from '@/engine/sprites/spriteCache'
import { createWorld, type EngineWorld } from '@/engine/world'
import { createDefaultState, type StudioState } from '@/store/useStudioStore'
import type { PlacedItem } from '@/data/types'
import { makeRecordingContext } from '../helpers/recordingContext'

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

beforeEach(() => {
  configureSpriteCache(
    () => ({ width: 0, height: 0, getContext: () => null }) as unknown as HTMLCanvasElement,
  )
})
afterEach(() => configureSpriteCache())

describe('renderFrame', () => {
  it('draws one of each item category: one clip, one drawImage per item', () => {
    const { ctx, calls } = makeRecordingContext()
    const R = computeVesselRect(800, 600)
    expect(() =>
      renderFrame(ctx, populatedWorld(), createDefaultState(), R, 1234, { w: 800, h: 600 }),
    ).not.toThrow()
    expect(calls.filter((c) => c === 'clip')).toHaveLength(1)
    expect(calls.filter((c) => c === 'drawImage')).toHaveLength(ITEMS.length)
    expect(calls.filter((c) => c === 'save')).toHaveLength(
      calls.filter((c) => c === 'restore').length,
    )
  })

  it('paints the substrate layers twice per frame (prototype second pass over specimens)', () => {
    const state: StudioState = createDefaultState()
    state.substrates = { ...state.substrates, water: 0 }
    const solid = SUBSTRATE_LAYERS.filter(
      (l) =>
        l.id !== 'water' &&
        l.id !== 'siphon' &&
        state.substrates[l.id as keyof typeof state.substrates] > 0.2,
    ).length
    const { ctx, calls } = makeRecordingContext()
    renderFrame(
      ctx,
      createWorld(),
      { ...state, hasGrowLamp: false },
      computeVesselRect(800, 600),
      0,
    )
    // sky gradient + one gradient per layer, twice
    expect(calls.filter((c) => c === 'createLinearGradient')).toHaveLength(1 + 2 * solid)
  })

  it.each(VESSELS.map((v) => v.id))('renders every lighting phase on %s', (vessel) => {
    for (const lighting of ['dawn', 'sunlight', 'twilight', 'night'] as const) {
      const { ctx, calls } = makeRecordingContext()
      const state: StudioState = { ...createDefaultState(), vessel, lighting, selectedId: 'a' }
      expect(() =>
        renderFrame(ctx, populatedWorld(), state, computeVesselRect(500, 700), 99),
      ).not.toThrow()
      expect(calls.filter((c) => c === 'clip')).toHaveLength(1)
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

describe('computeVesselRect', () => {
  it('is square and centred horizontally, 0.52 down vertically', () => {
    const R = computeVesselRect(1000, 600)
    expect(R.w).toBe(R.h)
    expect(R.w).toBeCloseTo(600 * 0.43 * 2)
    expect(R.x + R.w / 2).toBeCloseTo(500)
    expect(R.y + R.h / 2).toBeCloseTo(600 * 0.52)
  })

  it('fits the shorter canvas side and widens in relax mode', () => {
    expect(computeVesselRect(400, 900).w).toBeCloseTo(400 * 0.43 * 2)
    expect(computeVesselRect(400, 900, true).w).toBeCloseTo(400 * 0.46 * 2)
  })
})
