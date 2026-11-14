import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { findCatalogDef } from '@/data/catalog'
import type { PlacedItem } from '@/data/types'
import { getDividerNormX, getSoilSurfaceNormalizedY } from '@/engine/geometry'
import { vesselMetrics, normToPx } from '@/engine/render/metrics'
import { computeVesselRect } from '@/engine/render/renderFrame'
import {
  clearMountShadows,
  drawGroundShadow,
  drawMountShadow,
  lightK,
  shadowSprite,
  silhouetteOf,
} from '@/engine/render/shadows'
import { drawSpecimens, itemBox } from '@/engine/render/specimens'
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
  clearMountShadows()
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

type Call = { name: string; args: unknown[] }

/** Logs every call with its raw arguments and every property write, in order. */
function rawTrace() {
  const calls: Call[] = []
  const target: Record<string, unknown> = { globalAlpha: 1 }
  const gradient = { addColorStop: () => undefined }
  const ctx = new Proxy(target, {
    get(t, prop: string) {
      if (prop in t) return t[prop]
      return (...args: unknown[]) => {
        calls.push({ name: prop, args })
        return prop.startsWith('create') ? gradient : undefined
      }
    },
    set(t, prop: string, value) {
      calls.push({ name: `${prop}=`, args: [value] })
      t[prop] = value
      return true
    },
  }) as unknown as CanvasRenderingContext2D
  return { ctx, calls }
}

type FakeCanvas = { width: number; height: number; calls: Call[] | null; getContext(): unknown }

/** A canvas factory that gives a tracing context only to canvases `wants` accepts (by size). */
function tracingFactory(wants: (c: FakeCanvas) => boolean) {
  const made: FakeCanvas[] = []
  configureSpriteCache(() => {
    let ctx: CanvasRenderingContext2D | null = null
    const c: FakeCanvas = {
      width: 0,
      height: 0,
      calls: null,
      getContext() {
        if (!wants(c)) return null
        if (!ctx) {
          const t = rawTrace()
          ctx = t.ctx
          c.calls = t.calls
        }
        return ctx
      },
    }
    made.push(c)
    return c as unknown as HTMLCanvasElement
  })
  return made
}

const isMountCanvas = (c: FakeCanvas) => c.width === 192 && c.height === 192
const imageWidth = (call: Call) => (call.args[0] as { width: number }).width
const blits = (calls: Call[], w: number) =>
  calls.filter((c) => c.name === 'drawImage' && imageWidth(c) === w)

function rock(x = 0.6, y = 0.62): PlacedItem {
  return { ...fern(x, y), uid: 'rock', id: 'moss_wall_cliff', category: 'hardscape', zIndex: 1 }
}
function mounted(x = 0.6, y = 0.52, parentUid = 'rock'): PlacedItem {
  return { ...fern(x, y), uid: 'm', zIndex: 2, parentUid }
}

function frame(items: PlacedItem[], state = createDefaultState(), world = createWorld()) {
  world.items = items
  const { ctx, calls } = rawTrace()
  drawSpecimens(ctx, world, state, R, 0)
  return calls
}

describe('silhouette shadows', () => {
  it('silhouetteOf is cached per sprite and returns the source without a context', () => {
    const src = { width: 256, height: 256 } as HTMLCanvasElement
    expect(silhouetteOf(src)).toBe(src)

    const made = tracingFactory(() => true)
    const sil = silhouetteOf(src)
    expect(sil).not.toBe(src)
    expect(sil.width).toBe(256)
    expect(sil.height).toBe(256)
    expect(silhouetteOf(src)).toBe(sil)
    expect(made).toHaveLength(1)
    const calls = made[0].calls!
    // Blurred copies of the picture, then everything drawn is filled with the shadow colour
    expect(calls.filter((c) => c.name === 'drawImage').length).toBeGreaterThan(0)
    const op = calls.findIndex((c) => c.name === 'globalCompositeOperation=')
    expect(calls[op].args[0]).toBe('source-in')
    const fill = calls.findIndex((c) => c.name === 'fillRect')
    expect(fill).toBeGreaterThan(op)
    expect(calls.find((c) => c.name === 'fillStyle=')!.args[0]).toBe('#0b130e')
    expect(calls[fill].args).toEqual([0, 0, 256, 256])
  })

  it('a mounted item draws a mount shadow and no ground shadow', () => {
    tracingFactory(isMountCanvas)
    const state = createDefaultState()
    const alone = frame([rock()], state)
    const both = frame([rock(), mounted()], state)
    // The rock's own ground shadow is all the soft-shadow blits there are
    expect(blits(both, 128)).toHaveLength(blits(alone, 128).length)
    const mount = blits(both, 192)
    expect(mount).toHaveLength(1)
    const size = itemBox(R, mounted())!.size
    expect(mount[0].args[3]).toBeCloseTo(size * 1.5, 5)
    expect(mount[0].args[4]).toBeCloseTo(size * 1.5, 5)
    const at = both.indexOf(mount[0])
    const alpha = both
      .slice(0, at)
      .filter((c) => c.name === 'globalAlpha=')
      .at(-1)!
    expect(alpha.args[0]).toBeCloseTo(0.5 * lightK(state), 5)
  })

  it('the mount shadow is repainted when the parent moves and reused when nothing changed', () => {
    const made = tracingFactory(isMountCanvas)
    const state = createDefaultState()
    const world = createWorld()
    frame([rock(), mounted()], state, world)
    const canvas = made.find(isMountCanvas)!
    const clears = () => canvas.calls!.filter((c) => c.name === 'clearRect').length
    // The item's silhouette, then the parent's sprite as a mask
    expect(
      canvas.calls!.find(
        (c) => c.name === 'globalCompositeOperation=' && c.args[0] === 'destination-in',
      ),
    ).toBeTruthy()
    expect(clears()).toBe(1)
    frame([rock(), mounted()], state, world)
    expect(clears()).toBe(1)
    frame([rock(0.65), mounted()], state, world)
    expect(clears()).toBe(2)
    expect(made.filter(isMountCanvas)).toHaveLength(1)
  })

  it('an orphan (parentUid with no parent) draws no mount shadow and does not throw', () => {
    tracingFactory(isMountCanvas)
    let calls: Call[] = []
    expect(() => (calls = frame([mounted(0.6, 0.52, 'gone')]))).not.toThrow()
    expect(blits(calls, 192)).toHaveLength(0)
    expect(blits(calls, 128)).toHaveLength(0)
    // The plant itself is still drawn
    expect(calls.filter((c) => c.name === 'drawImage')).toHaveLength(1)
  })

  it('a glass climber draws its faint offset copy before its sprite', () => {
    const state = createDefaultState()
    const gecko: PlacedItem = {
      ...fern(0.6, 0.4),
      uid: 'g',
      id: 'mourning_gecko',
      category: 'fauna',
    }
    const s = itemBox(R, gecko)!.size
    const calls = frame([gecko], state)
    const draws = calls.filter((c) => c.name === 'drawImage')
    expect(draws).toHaveLength(2)
    const [copy, sprite] = draws
    expect(copy.args.slice(1).map(Number)).toEqual(
      [-s * 0.53, -s * 0.47, s, s].map((v) => expect.closeTo(v, 5)) as unknown as number[],
    )
    expect(sprite.args.slice(1)).toEqual([-s * 0.5, -s * 0.5, s, s])
    const at = calls.indexOf(copy)
    const alpha = calls
      .slice(0, at)
      .filter((c) => c.name === 'globalAlpha=')
      .at(-1)!
    expect(alpha.args[0]).toBeCloseTo(0.16 * lightK(state), 5)
    // The sprite goes back to full alpha
    const before = calls.slice(at, calls.indexOf(sprite)).filter((c) => c.name === 'globalAlpha=')
    expect(before.at(-1)!.args[0]).toBe(1)
  })

  /** The translate and blit that place the parent's sprite as the mask on the mount canvas. */
  function maskPlacement(calls: Call[]) {
    const from = calls.findIndex(
      (c) => c.name === 'globalCompositeOperation=' && c.args[0] === 'destination-in',
    )
    const after = calls.slice(from)
    return {
      at: after.find((c) => c.name === 'translate')!.args as number[],
      blit: after.find((c) => c.name === 'drawImage')!.args.slice(1) as number[],
    }
  }
  /** Where the mask must land for a given item box and parent box (lamp off: no lean). */
  function expectedMask(
    box: { x: number; y: number; size: number },
    pbox: { x: number; y: number; size: number },
  ) {
    const q = 192 / (box.size * 1.5)
    return {
      at: [96 + (pbox.x - box.x) * q, 96 + (pbox.y - box.y - box.size * 0.09) * q],
      blit: [(-pbox.size * q) / 2, (-pbox.size * q) / 2, pbox.size * q, pbox.size * q],
    }
  }
  const lampOff = () => ({ ...createDefaultState(), hasGrowLamp: false })

  it('the mask is placed from the parent box it is given, not from the parent item', () => {
    const made = tracingFactory(isMountCanvas)
    const parent = rock()
    const item = mounted()
    const box = itemBox(R, item)!
    const real = itemBox(R, parent)!
    // A box that no formula on parent.x / parent.y could produce: shifted right and up, and larger
    const pbox = { x: real.x + 13, y: real.y - 7, size: real.size * 1.1 }
    const { ctx } = rawTrace()
    drawMountShadow(ctx, lampOff(), R, item, box, parent, pbox)
    const got = maskPlacement(made.find(isMountCanvas)!.calls!)
    const want = expectedMask(box, pbox)
    got.at.forEach((v, k) => expect(v).toBeCloseTo(want.at[k], 5))
    got.blit.forEach((v, k) => expect(v).toBeCloseTo(want.blit[k], 5))
  })

  it('drawSpecimens masks with the parent itemBox under the world view', () => {
    const made = tracingFactory(isMountCanvas)
    const world = createWorld()
    const parent = rock(0.55, 0.64)
    const item = mounted(0.6, 0.5)
    frame([parent, item], lampOff(), world)
    const got = maskPlacement(made.find(isMountCanvas)!.calls!)
    const want = expectedMask(itemBox(R, item, world.view)!, itemBox(R, parent, world.view)!)
    got.at.forEach((v, k) => expect(v).toBeCloseTo(want.at[k], 5))
    got.blit.forEach((v, k) => expect(v).toBeCloseTo(want.blit[k], 5))
    // The parent sits left of and below the plant: the mask goes left and down (sign check)
    expect(got.at[0]).toBeLessThan(96)
    expect(got.at[1]).toBeGreaterThan(96)
  })
})
