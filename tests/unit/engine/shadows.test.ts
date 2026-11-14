import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { findCatalogDef } from '@/data/catalog'
import type { PlacedItem } from '@/data/types'
import { getDividerNormX, getSoilSurfaceNormalizedY } from '@/engine/geometry'
import { vesselMetrics, normToPx } from '@/engine/render/metrics'
import { computeVesselRect } from '@/engine/render/renderFrame'
import { drawGroundShadow, lightK, shadowSprite } from '@/engine/render/shadows'
import { itemBox } from '@/engine/render/specimens'
import { terrainOf } from '@/engine/render/terrain'
import { configureSpriteCache } from '@/engine/sprites/spriteCache'
import { createWorld } from '@/engine/world'
import { createDefaultState, type StudioState } from '@/store/studio'

/** Logs every call with its arguments and every globalAlpha write, in order. */
function traceContext() {
  const calls: { name: string; args: number[] }[] = []
  const state: Record<string, unknown> = { globalAlpha: 1 }
  const gradient = { addColorStop: () => undefined }
  const ctx = new Proxy(state, {
    get(target, prop: string) {
      if (prop in target) return target[prop]
      return (...args: number[]) => {
        calls.push({ name: prop, args })
        return prop.startsWith('create') ? gradient : undefined
      }
    },
    set(target, prop: string, value) {
      if (prop === 'globalAlpha') calls.push({ name: 'globalAlpha', args: [value as number] })
      target[prop] = value
      return true
    },
  }) as unknown as CanvasRenderingContext2D
  return { ctx, calls }
}

const R = computeVesselRect(800, 600)
const { cx, r } = vesselMetrics(R)

function fern(x: number, y = 0): PlacedItem {
  return {
    uid: 'f',
    id: 'peacock_fern',
    category: 'flora',
    stage: 'mature',
    x,
    y,
    scale: 1,
    rotation: 0,
    flipX: false,
    zIndex: 1,
  }
}

/** A fern at x whose centre sits `above` pixels over the soil line. */
function setup(x: number, above: (size: number) => number, state: StudioState) {
  const world = createWorld()
  const item = fern(x)
  const size = itemBox(R, item)!.size
  const soil = getSoilSurfaceNormalizedY(terrainOf(world, state), x)
  item.y = soil - above(size) / (2 * r)
  const box = itemBox(R, item)!
  return { world, item, box, def: findCatalogDef(item.id)!, soilPy: R.y + soil * R.h }
}

function shade(state: StudioState, x: number, above: (size: number) => number, alpha0 = 1) {
  const s = setup(x, above, state)
  const { ctx, calls } = traceContext()
  ctx.globalAlpha = alpha0
  calls.length = 0
  ctx.translate(s.box.x, s.box.y)
  drawGroundShadow(ctx, s.world, state, R, s.item, s.def, s.box, 0)
  return { ...s, calls }
}

beforeEach(() => {
  configureSpriteCache(
    () => ({ width: 0, height: 0, getContext: () => null }) as unknown as HTMLCanvasElement,
  )
})
afterEach(() => configureSpriteCache())

describe('ground shadows', () => {
  it('lightK is 0.4 at night, 1 with the lamp on, 0.65 with it off by day', () => {
    const s = createDefaultState()
    expect(lightK({ ...s, lighting: 'night', hasGrowLamp: true })).toBe(0.4)
    expect(lightK({ ...s, lighting: 'night', hasGrowLamp: false })).toBe(0.4)
    expect(lightK({ ...s, lighting: 'sunlight', hasGrowLamp: true })).toBe(1)
    expect(lightK({ ...s, lighting: 'twilight', hasGrowLamp: true })).toBe(1)
    expect(lightK({ ...s, lighting: 'sunlight', hasGrowLamp: false })).toBe(0.65)
  })

  it('a glass climber gets no ground shadow', () => {
    const world = createWorld()
    const state = createDefaultState()
    const item: PlacedItem = {
      ...fern(0.6, 0.5),
      uid: 'g',
      id: 'mourning_gecko',
      category: 'fauna',
    }
    const { ctx, calls } = traceContext()
    drawGroundShadow(ctx, world, state, R, item, findCatalogDef(item.id)!, itemBox(R, item)!, 0)
    expect(calls.filter((c) => c.name === 'drawImage')).toHaveLength(0)
  })

  it('a plant on the soil draws the shadow at the soil line, not at its own centre', () => {
    const state = createDefaultState()
    const { calls, box, soilPy } = shade(state, 0.6, (size) => size * 0.2)
    const moves = calls.filter((c) => c.name === 'translate')
    // The first translate is the item centre; the shadow's own one carries it down to the soil.
    expect(moves).toHaveLength(2)
    const dy = moves[1].args[1]
    expect(dy).toBeGreaterThan(0)
    expect(dy).toBeCloseTo(soilPy - box.y, 3)
    // The lamp is on and the fern is right of centre: the shadow leans right.
    const lean = (box.x - cx) / (R.w / 2)
    expect(moves[1].args[0]).toBeCloseTo(lean * box.size * 0.14, 3)
    // Two blits: the soft shadow and the darker core under a grounded item.
    expect(calls.filter((c) => c.name === 'drawImage')).toHaveLength(2)
  })

  it('a lifted item draws a wider, fainter shadow and nothing once alpha < 0.03', () => {
    const state = createDefaultState()
    const grounded = shade(state, 0.6, (size) => size * 0.2)
    // lift 0.5: 0.24·size plus 0.2·r above the soil
    const lifted = shade(state, 0.6, (size) => size * 0.24 + r * 0.2)
    const firstBlit = (calls: typeof grounded.calls) => calls.find((c) => c.name === 'drawImage')!
    const firstAlpha = (calls: typeof grounded.calls) =>
      calls.find((c) => c.name === 'globalAlpha')!.args[0]
    expect(firstBlit(lifted.calls).args[3]).toBeGreaterThan(firstBlit(grounded.calls).args[3])
    expect(firstAlpha(lifted.calls)).toBeLessThan(firstAlpha(grounded.calls))
    expect(firstAlpha(grounded.calls)).toBeCloseTo(0.8, 5)
    expect(firstAlpha(lifted.calls)).toBeCloseTo(0.8 * (1 - 0.5 * 0.85), 5)
    // No core under a lifted item
    expect(lifted.calls.filter((c) => c.name === 'drawImage')).toHaveLength(1)

    // Night, fully lifted, half-faded item: 0.5 · 0.4 · 0.15 = 0.03 → 0.2 · 0.4 · 0.15 < 0.03
    const night = { ...createDefaultState(), lighting: 'night' as const }
    const gone = shade(night, 0.6, (size) => size * 0.24 + r * 0.6, 0.2)
    expect(gone.calls.filter((c) => c.name === 'drawImage')).toHaveLength(0)
    expect(gone.calls.filter((c) => c.name === 'save')).toHaveLength(0)
  })

  it('a land shadow is clipped at the bank when there is a pool', () => {
    const state = createDefaultState()
    const { calls, box } = shade(state, 0.6, (size) => size * 0.2)
    const bank = normToPx(R, getDividerNormX(state.waterSplit)) - box.x
    const draw = calls.findIndex((c) => c.name === 'drawImage')
    const rect = calls.findIndex((c) => c.name === 'rect')
    expect(rect).toBeGreaterThanOrEqual(0)
    expect(rect).toBeLessThan(draw)
    expect(calls[rect].args[0]).toBeCloseTo(bank, 3)
    expect(calls[rect + 1].name).toBe('clip')

    // Without a pool there is no bank clip: only the ground-half clip remains.
    const noPool = { ...state, waterSplit: 0 }
    const land = shade(noPool, 0.6, (size) => size * 0.2)
    expect(land.calls.filter((c) => c.name === 'clip')).toHaveLength(1)
  })

  it('a shadow on the pool bed stays left of the bank and is fainter', () => {
    const state = createDefaultState()
    const { calls, box } = shade(state, 0.2, (size) => size * 0.2)
    const bank = normToPx(R, getDividerNormX(state.waterSplit)) - box.x
    const rect = calls.find((c) => c.name === 'rect')!
    expect(rect.args[0]).toBeCloseTo(bank - r * 4, 3)
    expect(rect.args[0] + rect.args[2]).toBeCloseTo(bank, 3)
    expect(calls.find((c) => c.name === 'globalAlpha')!.args[0]).toBeCloseTo(0.55 * 0.8, 5)
  })

  it('a floating leaf shades a strip of water just below it', () => {
    const world = createWorld()
    const state = createDefaultState()
    const item: PlacedItem = { ...fern(0.2, 0.6), id: 'frogbit_pads' }
    const box = itemBox(R, item)!
    const { ctx, calls } = traceContext()
    drawGroundShadow(ctx, world, state, R, item, findCatalogDef(item.id)!, box, 0)
    const rect = calls.find((c) => c.name === 'rect')!
    expect(rect.args).toEqual([-box.size, box.size * 0.03, box.size * 2, box.size * 0.3])
    expect(calls.filter((c) => c.name === 'drawImage')).toHaveLength(1)
    expect(calls.filter((c) => c.name === 'translate')).toHaveLength(0)
  })

  it('does not throw with a context-less sprite factory', () => {
    const sprite = shadowSprite()
    expect(sprite.width).toBe(128)
    expect(sprite.height).toBe(32)
    const state = createDefaultState()
    expect(() => shade(state, 0.6, (size) => size * 0.2)).not.toThrow()
  })
})
