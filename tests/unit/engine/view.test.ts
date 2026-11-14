import { describe, expect, it } from 'vitest'
import type { PlacedItem, Rect } from '@/data/types'
import { computeVesselRect } from '@/engine/render/renderFrame'
import {
  CAM_MAX,
  camHome,
  camToBase,
  clampCam,
  createView,
  focusOn,
  framePlants,
  releaseFocus,
  updateCamera,
  zoomAt,
  type Cam,
  type ViewState,
} from '@/engine/view'
import { createWorld, type EngineWorld } from '@/engine/world'
import { createDefaultState, type StudioState } from '@/store/studio'

const base = { scale: 1, rotation: 0, flipX: false, x: 0.5, y: 0.6 }
const fern = (uid: string, over: Partial<PlacedItem> = {}): PlacedItem => ({
  ...base,
  uid,
  id: 'peacock_fern',
  category: 'flora',
  zIndex: 1,
  stage: 'lush',
  ...over,
})
const gecko = (uid: string, over: Partial<PlacedItem> = {}): PlacedItem => ({
  ...base,
  uid,
  id: 'mourning_gecko',
  category: 'fauna',
  zIndex: 2,
  ...over,
})

function worldWith(items: PlacedItem[]): EngineWorld {
  const world = createWorld()
  world.items = items
  return world
}

/** A view that has seen one desktop frame, so zoomAt and framePlants know the canvas size. */
function sizedView(w = 1000, h = 800): ViewState {
  const view = createView()
  view.size = { w, h }
  view.framedOnce = true
  return view
}

const state = (over: Partial<StudioState> = {}): StudioState => ({
  ...createDefaultState(),
  ...over,
})

/** The matrix applyCamera builds, applied by hand to a canvas point. */
function applyByHand(c: Cam, W: number, H: number, x: number, y: number) {
  return { x: (x - c.u * W) * c.z + W / 2, y: (y - c.v * H) * c.z + H / 2 }
}

describe('camera maths', () => {
  it('clampCam keeps zoom in 1..4 and the view inside the canvas', () => {
    expect(clampCam({ z: 0.3, u: 0.1, v: 0.9 })).toEqual({ z: 1, u: 0.5, v: 0.5 })
    const c = clampCam({ z: 9, u: -1, v: 2 })
    expect(c.z).toBe(CAM_MAX)
    expect(c.u).toBeCloseTo(0.5 / CAM_MAX)
    expect(c.v).toBeCloseTo(1 - 0.5 / CAM_MAX)
    const inside = { z: 2, u: 0.4, v: 0.6 }
    expect(clampCam(inside)).toBe(inside)
    expect(inside).toEqual({ z: 2, u: 0.4, v: 0.6 })
  })

  it('a point survives applyCamera then camToBase', () => {
    const W = 900
    const H = 600
    const cams: Cam[] = [
      { z: 1, u: 0.5, v: 0.5 },
      { z: 2.5, u: 0.3, v: 0.7 },
      { z: 4, u: 0.875, v: 0.125 },
    ]
    for (const c of cams) {
      for (const [x, y] of [
        [120, 80],
        [450, 300],
        [800, 590],
      ]) {
        const s = applyByHand(c, W, H, x, y)
        const b = camToBase(c, s.x, s.y, W, H)
        expect(b.x).toBeCloseTo(x, 6)
        expect(b.y).toBeCloseTo(y, 6)
      }
    }
  })

  it('zoomAt keeps the point under the cursor fixed', () => {
    const view = sizedView(1000, 800)
    const { w, h } = view.size!
    for (const [sx, sy, z] of [
      [300, 200, 2],
      [700, 650, 3.2],
      [500, 400, 1.5],
    ]) {
      const before = camToBase(view.cam, sx, sy, w, h)
      zoomAt(view, sx, sy, z, true)
      const after = camToBase(view.cam, sx, sy, w, h)
      expect(Math.abs(after.x - before.x)).toBeLessThan(1e-6)
      expect(Math.abs(after.y - before.y)).toBeLessThan(1e-6)
      expect(view.cam).toEqual(view.camT)
    }
  })

  it('zoomAt at zoom 1 leaves u, v at 0.5', () => {
    const view = sizedView()
    view.follow = { uids: ['a'], z: 2, until: 1e9 }
    zoomAt(view, 120, 700, 1, false)
    expect(view.camT).toEqual({ z: 1, u: 0.5, v: 0.5 })
    expect(view.follow).toBeNull()
    zoomAt(view, 120, 700, 2, false)
    zoomAt(view, 900, 50, 0.5, false)
    expect(view.camT).toEqual({ z: 1, u: 0.5, v: 0.5 })
  })
})

describe('framing and close-ups', () => {
  it('framePlants ignores glass climbers and never zooms past 2.6', () => {
    const R = computeVesselRect(1200, 800)
    const plain = sizedView(1200, 800)
    framePlants(plain, worldWith([fern('a')]), R)
    const withGecko = sizedView(1200, 800)
    framePlants(withGecko, worldWith([fern('a'), gecko('g', { y: 0.05 })]), R)
    expect(withGecko.camT).toEqual(plain.camT)
    expect(plain.camT.z).toBeGreaterThan(1)

    // A small vessel in a big canvas would fit at 6x; the frame stops at 2.6.
    const small: Rect = { x: 400, y: 400, w: 200, h: 200 }
    const view = sizedView(1000, 1000)
    view.follow = { uids: ['a'], z: 2, until: 1e9 }
    framePlants(view, worldWith([fern('a')]), small)
    expect(view.camT.z).toBe(2.6)
    expect(view.follow).toBeNull()
  })

  it('framePlants on a 390 px canvas lets the sides crop (fit = min(2.4, H / h))', () => {
    const W = 390
    const H = 844
    const R = computeVesselRect(W, H)
    const view = sizedView(W, H)
    framePlants(view, worldWith([fern('a')]), R)
    // The planted band is far shorter than the screen, so the 2.4 cap decides; the width does not.
    expect(view.camT.z).toBeCloseTo(2.4 * 0.97, 6)
    expect(view.camT.u).toBeCloseTo(0.5, 6)
  })

  it('focusOn saves the view once and releaseFocus restores it', () => {
    const view = sizedView()
    Object.assign(view.camT, { z: 1.5, u: 0.45, v: 0.55 })
    focusOn(view, ['a'], 2, 3200, 1000)
    expect(view.saved).toEqual({ z: 1.5, u: 0.45, v: 0.55 })
    expect(view.follow).toEqual({ uids: ['a'], z: 2, until: 4200 })
    Object.assign(view.camT, { z: 3.5, u: 0.6, v: 0.4 })
    focusOn(view, ['b'], 2, 3200, 2000)
    expect(view.saved).toEqual({ z: 1.5, u: 0.45, v: 0.55 })
    // z = max(z, min(camT.z, 3))
    expect(view.follow?.z).toBe(3)
    releaseFocus(view)
    expect(view.follow).toBeNull()
    expect(view.saved).toBeNull()
    expect(view.camT).toEqual({ z: 1.5, u: 0.45, v: 0.55 })
  })

  it('a follow whose items are gone releases to the saved view', () => {
    const W = 1000
    const H = 800
    const R = computeVesselRect(W, H)
    const view = sizedView(W, H)
    const world = worldWith([fern('a', { x: 0.3 })])
    focusOn(view, ['a'], 2, 3200, 100)
    updateCamera(view, world, state(), R, { w: W, h: H }, 16.67, 200, false)
    expect(view.camT.z).toBe(2)
    expect(view.camT.u).toBeLessThan(0.5)

    world.items = []
    updateCamera(view, world, state(), R, { w: W, h: H }, 16.67, 300, false)
    expect(view.follow).toBeNull()
    expect(view.camT).toEqual({ z: 1, u: 0.5, v: 0.5 })

    // And a follow past its time releases too.
    world.items = [fern('a')]
    focusOn(view, ['a'], 2, 100, 1000)
    updateCamera(view, world, state(), R, { w: W, h: H }, 16.67, 1200, false)
    expect(view.follow).toBeNull()
    expect(view.camT).toEqual({ z: 1, u: 0.5, v: 0.5 })
  })

  it('the phone start frames once and not again after the user zooms out', () => {
    const W = 390
    const H = 844
    const R = computeVesselRect(W, H)
    const view = createView()
    const world = worldWith([fern('a')])
    updateCamera(view, world, state(), R, { w: W, h: H }, 16.67, 0, false)
    expect(view.framedOnce).toBe(true)
    expect(view.camT.z).toBeCloseTo(2.4 * 0.97, 6)

    camHome(view)
    updateCamera(view, world, state(), R, { w: W, h: H }, 16.67, 16, false)
    expect(view.camT).toEqual({ z: 1, u: 0.5, v: 0.5 })

    // A desktop canvas is never framed.
    const desk = createView()
    updateCamera(
      desk,
      world,
      state(),
      computeVesselRect(1200, 800),
      { w: 1200, h: 800 },
      16.67,
      0,
      false,
    )
    expect(desk.framedOnce).toBe(true)
    expect(desk.camT).toEqual({ z: 1, u: 0.5, v: 0.5 })
  })
})

describe('updateCamera', () => {
  const W = 1000
  const H = 800
  const R = computeVesselRect(W, H)

  it('reduced motion jumps to the target in one update', () => {
    const view = sizedView(W, H)
    Object.assign(view.camT, { z: 2.2, u: 0.6, v: 0.4 })
    updateCamera(
      view,
      worldWith([]),
      state({ reducedMotion: true }),
      R,
      { w: W, h: H },
      16.67,
      0,
      false,
    )
    expect(view.cam).toEqual({ z: 2.2, u: 0.6, v: 0.4 })

    // Without reduced motion one 60 fps frame moves a tenth of the way.
    const eased = sizedView(W, H)
    Object.assign(eased.camT, { z: 2, u: 0.5, v: 0.5 })
    updateCamera(eased, worldWith([]), state(), R, { w: W, h: H }, 16.67, 0, false)
    expect(eased.cam.z).toBeCloseTo(1.1, 6)
  })

  it('parallax is zero with depth off and frozen while dragging', () => {
    const off = sizedView(W, H)
    off.depthOn = false
    off.pointerScreen = { x: 1, y: -1 }
    Object.assign(off.camT, { z: 2, u: 0.7, v: 0.7 })
    Object.assign(off.cam, off.camT)
    for (let i = 0; i < 30; i++)
      updateCamera(off, worldWith([]), state(), R, { w: W, h: H }, 16.67, i * 16, true)
    expect(off.par).toEqual({ x: 0, y: 0 })

    const on = sizedView(W, H)
    on.pointerScreen = { x: 1, y: -1 }
    updateCamera(on, worldWith([]), state(), R, { w: W, h: H }, 16.67, 0, true)
    expect(on.par.x).toBeGreaterThan(0)
    expect(on.par.y).toBeLessThan(0)

    const dragging = sizedView(W, H)
    dragging.pointerScreen = { x: 1, y: -1 }
    const world = worldWith([fern('a')])
    world.draggingId = 'a'
    for (let i = 0; i < 30; i++)
      updateCamera(dragging, world, state(), R, { w: W, h: H }, 16.67, i * 16, true)
    expect(dragging.par).toEqual({ x: 0, y: 0 })
  })
})
