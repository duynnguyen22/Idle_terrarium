import { describe, expect, it } from 'vitest'
import type { PlacedItem } from '@/data/types'
import { computeVesselRect } from '@/engine/render/renderFrame'
import { itemBox } from '@/engine/render/specimens'
import { camToBase, createView, type ViewState } from '@/engine/view'
import {
  beginPan,
  beginPinch,
  doubleClick,
  movePan,
  movePinch,
  wheelZoom,
} from '@/engine/viewInput'
import { createWorld } from '@/engine/world'

const W = 1000
const H = 800

/** A view that has seen one desktop frame, so the gestures know the canvas size. */
function sizedView(z = 1, u = 0.5, v = 0.5): ViewState {
  const view = createView()
  view.size = { w: W, h: H }
  view.framedOnce = true
  view.cam = { z, u, v }
  view.camT = { z, u, v }
  return view
}

const fern: PlacedItem = {
  uid: 'f1',
  id: 'peacock_fern',
  category: 'flora',
  x: 0.5,
  y: 0.6,
  scale: 1,
  rotation: 0,
  flipX: false,
  zIndex: 1,
  stage: 'lush',
}

describe('wheel', () => {
  it('wheel up zooms in about the cursor; ctrl+wheel is the stronger trackpad pinch', () => {
    const view = sizedView()
    const before = camToBase(view.cam, 300, 200, W, H)
    wheelZoom(view, 300, 200, -100, false)
    expect(view.cam.z).toBeCloseTo(Math.exp(100 * 0.0016))
    // Snapped: the drawn camera is the target, no ease.
    expect(view.cam).toEqual(view.camT)
    const after = camToBase(view.cam, 300, 200, W, H)
    expect(after.x).toBeCloseTo(before.x)
    expect(after.y).toBeCloseTo(before.y)

    const pinch = sizedView()
    wheelZoom(pinch, 300, 200, -100, true)
    expect(pinch.cam.z).toBeCloseTo(Math.min(4, Math.exp(100 * 0.012)))
    expect(pinch.cam.z).toBeGreaterThan(view.cam.z)

    // Wheel down at 100 % stays at the whole tank.
    const home = sizedView()
    wheelZoom(home, 500, 400, 120, false)
    expect(home.cam).toEqual({ z: 1, u: 0.5, v: 0.5 })
  })
})

describe('pan', () => {
  it('beginPan returns null at 100 % and a pan moves the view by dx / zoom', () => {
    expect(beginPan(sizedView(1), 400, 300)).toBeNull()
    expect(beginPan(sizedView(1.01), 400, 300)).toBeNull()

    const view = sizedView(2)
    view.follow = { uids: ['x'], z: 2, until: 1e9 }
    const pan = beginPan(view, 400, 300)
    expect(pan).not.toBeNull()
    if (!pan) return
    expect(view.follow).toBeNull()
    expect(view.gesture).toBe(true)

    movePan(view, pan, 402, 301)
    expect(pan.moved).toBe(false)

    movePan(view, pan, 500, 340)
    expect(pan.moved).toBe(true)
    expect(view.camT.z).toBe(2)
    expect(view.camT.u).toBeCloseTo(0.5 - 100 / 2 / W)
    expect(view.camT.v).toBeCloseTo(0.5 - 40 / 2 / H)
    expect(view.cam).toEqual(view.camT)

    // Clamped to the canvas: a huge drag stops at the edge.
    movePan(view, pan, 5000, 5000)
    expect(view.camT.u).toBeCloseTo(0.25)
    expect(view.camT.v).toBeCloseTo(0.25)
  })
})

describe('pinch', () => {
  it('pinch scales by the finger distance ratio about the midpoint', () => {
    const view = sizedView(1.5)
    const pinch = beginPinch(view, { x: 400, y: 300 }, { x: 500, y: 300 })
    expect(view.gesture).toBe(true)
    const before = camToBase(view.cam, 450, 300, W, H)

    movePinch(view, pinch, { x: 350, y: 300 }, { x: 550, y: 300 })
    expect(view.cam.z).toBeCloseTo(3)
    expect(view.cam).toEqual(view.camT)
    const after = camToBase(view.cam, 450, 300, W, H)
    expect(after.x).toBeCloseTo(before.x)
    expect(after.y).toBeCloseTo(before.y)

    // The next move is relative to the last one: the same spread holds the zoom.
    movePinch(view, pinch, { x: 350, y: 300 }, { x: 550, y: 300 })
    expect(view.cam.z).toBeCloseTo(3)
  })
})

describe('double-click', () => {
  it('double-click on an item centres it at >= 240 %, on empty space zooms to 200 %, and when zoomed goes home', () => {
    const R = computeVesselRect(W, H)
    const world = createWorld()
    world.items = [{ ...fern }]
    const box = itemBox(R, fern)
    if (!box) throw new Error('fern has no box')

    const view = sizedView()
    world.view = view
    doubleClick(view, world, R, 1, box.x, box.y)
    expect(view.camT.z).toBeCloseTo(2.4)
    expect(view.camT.u).toBeCloseTo(box.x / W)
    expect(view.camT.v).toBeCloseTo(box.y / H)

    // Already deeper: keeps the zoom.
    const deep = sizedView(3, box.x / W, box.y / H)
    doubleClick(deep, world, R, 1, W / 2, H / 2)
    expect(deep.camT.z).toBe(3)

    // Empty space at 100 %: zoom to 2 about the point.
    const empty = sizedView()
    const before = camToBase(empty.camT, 700, 250, W, H)
    doubleClick(empty, world, R, 1, 700, 250)
    expect(empty.camT.z).toBe(2)
    const after = camToBase(empty.camT, 700, 250, W, H)
    expect(after.x).toBeCloseTo(before.x)
    expect(after.y).toBeCloseTo(before.y)

    // Empty space while zoomed: home.
    const zoomed = sizedView(2, 0.3, 0.3)
    doubleClick(zoomed, world, R, 1, 120, 110)
    expect(zoomed.camT).toEqual({ z: 1, u: 0.5, v: 0.5 })
  })
})
