import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PlacedItem } from '@/data/types'
import { hazedSprite, planeOf, planeShiftFor } from '@/engine/render/depth'
import { vesselMetrics } from '@/engine/render/metrics'
import { computeVesselRect, renderFrame } from '@/engine/render/renderFrame'
import { itemBox } from '@/engine/render/specimens'
import { configureSpriteCache } from '@/engine/sprites/spriteCache'
import { createView } from '@/engine/view'
import { createWorld } from '@/engine/world'
import { createDefaultState, type StudioState } from '@/store/studio'
import { makeTraceContext } from '../helpers/recordingContext'

// Every front-frame and lid draw first logs a marker on the context, so the trace shows where each begins.
vi.mock('@/engine/render/frame', async (importOriginal) => {
  const orig = await importOriginal<typeof import('@/engine/render/frame')>()
  const mark = (ctx: CanvasRenderingContext2D, name: string) =>
    (ctx as unknown as { mark: (n: string) => void }).mark(name)
  return {
    ...orig,
    drawPaludariumFrontFrame: (...a: Parameters<typeof orig.drawPaludariumFrontFrame>) => {
      mark(a[0], 'frame')
      orig.drawPaludariumFrontFrame(...a)
    },
    drawLid: (...a: Parameters<typeof orig.drawLid>) => {
      mark(a[0], 'lid')
      orig.drawLid(...a)
    },
  }
})

const R = computeVesselRect(800, 600)
const { r } = vesselMetrics(R)
const b = { scale: 1, rotation: 0, flipX: false, zIndex: 1 }
const fern = (uid: string, x: number, y: number, parentUid?: string): PlacedItem => ({
  ...b,
  uid,
  id: 'peacock_fern',
  category: 'flora',
  stage: 'mature',
  x,
  y,
  parentUid,
})
const rock: PlacedItem = {
  ...b,
  uid: 'rock',
  id: 'golden_river_boulders',
  category: 'hardscape',
  x: 0.3,
  y: 0.7,
}
const wall: PlacedItem = {
  ...b,
  uid: 'wall',
  id: 'moss_wall_cliff',
  category: 'hardscape',
  x: 0.6,
  y: 0.5,
}
const shrimp: PlacedItem = {
  ...b,
  uid: 'c',
  id: 'medaka_fish',
  category: 'fauna',
  x: 0.8,
  y: 0.8,
}

type Call = { name: string; args: unknown[] }
type FakeCanvas = { width: number; height: number; calls: Call[] | null; getContext(): unknown }

/** Sprite factory whose canvases log every call and property write; `live` false gives no context. */
function tracingFactory(live: boolean) {
  const made: FakeCanvas[] = []
  configureSpriteCache(() => {
    const calls: Call[] = []
    const ctx = new Proxy({} as Record<string, unknown>, {
      get(t, prop: string) {
        if (prop in t) return t[prop]
        return (...args: unknown[]) => void calls.push({ name: prop, args })
      },
      set(t, prop: string, value) {
        calls.push({ name: `${prop}=`, args: [value] })
        t[prop] = value
        return true
      },
    })
    const c: FakeCanvas = {
      width: 0,
      height: 0,
      calls: live ? calls : null,
      getContext: () => (live ? ctx : null),
    }
    made.push(c)
    return c as unknown as HTMLCanvasElement
  })
  return made
}

beforeEach(() => tracingFactory(false))
afterEach(() => configureSpriteCache())

describe('depth planes', () => {
  it('planeOf: loose plants and animals 0, hardscape and mounted items 1, the moss wall 2', () => {
    const items = [rock, wall]
    expect(planeOf(fern('f', 0.5, 0.7))).toBe(0)
    expect(planeOf(shrimp)).toBe(0)
    expect(planeOf(rock)).toBe(1)
    expect(planeOf(wall)).toBe(2)
    // A mounted item sits on its parent's plane, so it never drifts off the surface it grows on
    expect(planeOf(fern('m', 0.3, 0.62, 'rock'), items)).toBe(1)
    expect(planeOf(fern('m', 0.6, 0.4, 'wall'), items)).toBe(2)
    // An orphan (its parent is gone), or no list to look the parent up in: plane 1
    expect(planeOf(fern('m', 0.6, 0.4, 'gone'), items)).toBe(1)
    expect(planeOf(fern('m', 0.6, 0.4, 'wall'))).toBe(1)
  })

  it('planeShiftFor is zero with depth off and for plane 0; plane 2 moves 0.034 r per unit of parallax', () => {
    const view = createView()
    view.par = { x: 1, y: 1 }
    expect(planeShiftFor(view, 0, r)).toEqual({ x: 0, y: 0 })
    const p2 = planeShiftFor(view, 2, r)
    expect(p2.x).toBeCloseTo(0.034 * r, 9)
    expect(p2.y).toBeCloseTo(0.034 * r * 0.35, 9)
    const p1 = planeShiftFor(view, 1, r)
    expect(p1.x).toBeCloseTo(0.013 * r, 9)
    expect(p1.y).toBeCloseTo(0.013 * r * 0.35, 9)
    view.par = { x: -1.5, y: 0.5 }
    expect(planeShiftFor(view, 2, r).x).toBeCloseTo(-1.5 * 0.034 * r, 9)
    expect(planeShiftFor(view, 2, r).y).toBeCloseTo(0.5 * 0.034 * r * 0.35, 9)
    view.depthOn = false
    expect(planeShiftFor(view, 1, r)).toEqual({ x: 0, y: 0 })
    expect(planeShiftFor(view, 2, r)).toEqual({ x: 0, y: 0 })
  })

  it('hazedSprite is cached per lighting and returns the source for plane 0 or without a context', () => {
    const src = { width: 256, height: 256 } as HTMLCanvasElement
    // No context (tests, a lost context): the picture itself
    expect(hazedSprite(src, 1, 'night', true)).toBe(src)

    const made = tracingFactory(true)
    expect(hazedSprite(src, 0, 'night', true)).toBe(src)
    expect(hazedSprite(src, 2, 'night', false)).toBe(src)
    expect(made).toHaveLength(0)

    const night = hazedSprite(src, 2, 'night', true)
    expect(night).not.toBe(src)
    expect(night.width).toBe(256)
    expect(night.height).toBe(256)
    expect(hazedSprite(src, 2, 'night', true)).toBe(night)
    expect(made).toHaveLength(1)
    const dawn = hazedSprite(src, 2, 'dawn', true)
    const near = hazedSprite(src, 1, 'night', true)
    expect(new Set([night, dawn, near]).size).toBe(3)
    expect(made).toHaveLength(3)

    // The picture, then a wash of the air colour over what is drawn
    const wash = (c: FakeCanvas) => {
      const calls = c.calls!
      const op = calls.findIndex((k) => k.name === 'globalCompositeOperation=')
      return {
        first: calls[0],
        op: calls[op].args[0],
        alpha: calls.find((k) => k.name === 'globalAlpha=')!.args[0],
        fill: calls.find((k) => k.name === 'fillStyle=')!.args[0],
        rect: calls.find((k) => k.name === 'fillRect')!.args,
        rectAfterOp: calls.findIndex((k) => k.name === 'fillRect') > op,
      }
    }
    expect(wash(made[0])).toEqual({
      first: { name: 'drawImage', args: [src, 0, 0] },
      op: 'source-atop',
      alpha: 0.2,
      fill: '#1c2538',
      rect: [0, 0, 256, 256],
      rectAfterOp: true,
    })
    expect(wash(made[1]).fill).toBe('#efe6d3')
    expect(wash(made[2]).alpha).toBe(0.07)
    expect(wash(made[2]).fill).toBe('#1c2538')
    hazedSprite(src, 1, 'twilight', true)
    hazedSprite(src, 1, 'sunlight', true)
    expect(wash(made[3]).fill).toBe('#5b4046')
    expect(wash(made[4]).fill).toBe('#e6ede9')
  })

  it('itemBox with a view moves a mounted item with its rock', () => {
    const view = createView()
    view.par = { x: 1.2, y: -0.9 }
    const onRock = fern('m1', 0.3, 0.62, 'rock')
    const onWall = fern('m2', 0.62, 0.4, 'wall')
    const loose = fern('f', 0.5, 0.75)
    const items = [rock, onRock, wall, onWall, loose]
    const shift = (item: PlacedItem) => {
      const flat = itemBox(R, item)!
      const moved = itemBox(R, item, view, items)!
      expect(moved.size).toBe(flat.size)
      return { x: moved.x - flat.x, y: moved.y - flat.y }
    }
    const near = planeShiftFor(view, 1, r)
    const far = planeShiftFor(view, 2, r)
    expect(near.x).not.toBe(0)
    expect(far.x).not.toBeCloseTo(near.x, 3)

    // A mount on a hardscape rock: plane 1, the same shift as its rock
    expect(shift(rock).x).toBeCloseTo(near.x, 9)
    expect(shift(rock).y).toBeCloseTo(near.y, 9)
    expect(shift(onRock).x).toBeCloseTo(shift(rock).x, 9)
    expect(shift(onRock).y).toBeCloseTo(shift(rock).y, 9)
    // A mount on the moss wall: plane 2, the same shift as the wall
    expect(shift(wall).x).toBeCloseTo(far.x, 9)
    expect(shift(wall).y).toBeCloseTo(far.y, 9)
    expect(shift(onWall).x).toBeCloseTo(shift(wall).x, 9)
    expect(shift(onWall).y).toBeCloseTo(shift(wall).y, 9)
    // The soil plane stays put
    expect(shift(loose)).toEqual({ x: 0, y: 0 })

    // Depth off: nothing moves
    view.depthOn = false
    for (const item of items) expect(shift(item)).toEqual({ x: 0, y: 0 })
  })

  it('the glass edge is drawn after the front frame and before the lid', () => {
    const world = createWorld()
    const glass = (trace: string[]) => trace.findIndex((t) => t === `lineWidth=${r * 0.045}`)
    const mark = (trace: string[], name: string) => trace.indexOf(`mark(["${name}"])`)
    const draw = (lighting: StudioState['lighting'], depthOn: boolean) => {
      world.view.depthOn = depthOn
      const { ctx, trace } = makeTraceContext()
      const state: StudioState = { ...createDefaultState(), lighting }
      renderFrame(ctx, world, state, R, 0, { w: 800, h: 600 })
      return trace
    }
    const day = draw('sunlight', true)
    expect(glass(day)).toBeGreaterThan(mark(day, 'frame'))
    expect(glass(day)).toBeLessThan(mark(day, 'lid'))
    expect(mark(day, 'frame')).toBeGreaterThan(-1)
    // The reflection band, the lit inner edge and the dark line, all clipped to the vessel
    const from = day.lastIndexOf('clip([])', glass(day))
    expect(from).toBeGreaterThan(mark(day, 'frame'))
    const band = day.slice(from, mark(day, 'lid'))
    expect(band).toContain('fillStyle=rgba(255, 255, 255, 0.05)')
    expect(band).toContain('strokeStyle=rgba(255, 255, 255, 0.13)')
    expect(band).toContain(`lineWidth=${r * 0.014}`)
    expect(band).toContain('strokeStyle=rgba(16, 32, 24, 0.16)')

    const night = draw('night', true)
    const nb = night.slice(mark(night, 'frame'), mark(night, 'lid'))
    expect(nb).toContain('fillStyle=rgba(255, 255, 255, 0.025)')
    expect(nb).toContain('strokeStyle=rgba(255, 255, 255, 0.05)')

    // Depth off: no glass edge at all
    expect(glass(draw('sunlight', false))).toBe(-1)
  })
})
