import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { HardscapeDef } from '@/data/types'
import { DEFAULT_SUBSTRATES } from '@/data/substrates'
import { addItem } from '@/engine/items'
import {
  applyTool,
  beginDrag,
  endDrag,
  hitTest,
  SNAP_RADIUS,
  updateDrag,
} from '@/engine/interaction'
import { createWorld, type EngineWorld } from '@/engine/world'

/** A test-only host with a single mount point half a host size to the right of its centre. */
const LEDGE = vi.hoisted((): HardscapeDef => ({
  id: 'test_ledge',
  name: 'Test Ledge',
  category: 'hardscape',
  baseScale: 1,
  desc: '',
  mountPoints: [{ ox: 0.5, oy: 0 }],
}))
vi.mock('@/data/catalog', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/catalog')>()
  return {
    ...actual,
    findCatalogDef: (id: string) => (id === LEDGE.id ? LEDGE : actual.findCatalogDef(id)),
  }
})

let world: EngineWorld
beforeEach(() => {
  world = createWorld()
})

const terrain = { substrates: DEFAULT_SUBSTRATES, waterSplit: 0.32 }

function place(id: string, x: number, y: number) {
  const it = addItem(world, id, 'mature', { terrain, x, y })!
  return it
}

describe('hitTest', () => {
  it('picks the topmost of two overlapping items', () => {
    const a = place('peacock_fern', 0.5, 0.5)
    const b = place('boston_fern', 0.5, 0.5)
    a.zIndex = 1
    b.zIndex = 5
    expect(hitTest(world, 0.51, 0.5)?.uid).toBe(b.uid)
    b.zIndex = 0
    expect(hitTest(world, 0.51, 0.5)?.uid).toBe(a.uid)
  })
  it('misses outside 0.085 * scale', () => {
    place('peacock_fern', 0.5, 0.5)
    expect(hitTest(world, 0.8, 0.8)).toBeNull()
  })
  it('hit test scales dx by kx', () => {
    const item = place('peacock_fern', 0.5, 0.5)
    item.x = 0.5
    item.y = 0.5
    item.scale = 1
    expect(hitTest(world, 0.57, 0.5)).toBe(item)
    expect(hitTest(world, 0.57, 0.5, 2)).toBeNull()
    expect(hitTest(world, 0.53, 0.5, 2)).toBe(item)
  })
})

describe('drag', () => {
  it('moves the item by the pointer delta', () => {
    const it = place('peacock_fern', 0.5, 0.5)
    beginDrag(world, it, 0.52, 0.5)
    updateDrag(world, 0.6, 0.45)
    expect(it.x).toBeCloseTo(0.58)
    expect(it.y).toBeCloseTo(0.45)
    endDrag(world)
    expect(world.draggingId).toBeNull()
  })

  it('clamps to the play area', () => {
    const it = place('peacock_fern', 0.5, 0.5)
    beginDrag(world, it, 0.5, 0.5)
    updateDrag(world, 2, 2)
    expect(it.x).toBe(0.82)
    expect(it.y).toBe(0.86)
  })

  it('snaps a mountable plant to a mount point and sets parentUid/offset', () => {
    const rock = place('river_stones', 0.4, 0.6)
    const plant = place('peacock_fern', 0.7, 0.5)
    const mpx = rock.x
    const mpy = rock.y + -0.14 * 0.18 * rock.scale
    beginDrag(world, plant, 0.7, 0.5)
    updateDrag(world, mpx + SNAP_RADIUS * 0.5, mpy)
    expect(plant.parentUid).toBe(rock.uid)
    expect(plant.x).toBeCloseTo(mpx)
    expect(plant.y).toBeCloseTo(mpy)
    expect(plant.offsetX).toBeCloseTo(0)
    expect(plant.offsetY).toBeCloseTo(mpy - rock.y)
    expect(world.hoveredSnapTarget).toBe(rock.uid)
  })

  it('mount points scale by 1/kx', () => {
    const host = place('river_stones', 0.5, 0.6)
    Object.assign(host, { id: LEDGE.id, x: 0.5, y: 0.6, scale: 1 })
    const plant = place('peacock_fern', 0.3, 0.3)

    // Square vessel: the mount point sits at 0.5 + 0.5 * 0.18 = 0.59.
    beginDrag(world, plant, plant.x, plant.y)
    updateDrag(world, 0.55, 0.6)
    expect(plant.parentUid).toBe(host.uid)
    expect(plant.x).toBeCloseTo(0.59)
    endDrag(world)

    // kx = 2: the same mount point sits at 0.5 + 0.09 / 2 = 0.545.
    beginDrag(world, plant, plant.x, plant.y)
    updateDrag(world, 0.55, 0.6, 2)
    expect(plant.parentUid).toBe(host.uid)
    expect(plant.x).toBeCloseTo(0.545)
    expect(plant.y).toBeCloseTo(0.6)
    expect(plant.offsetX).toBeCloseTo(0.045)
    expect(plant.offsetY).toBeCloseTo(0)
    endDrag(world)
  })

  it('does not snap a non-mountable item', () => {
    const rock = place('river_stones', 0.4, 0.6)
    const other = place('river_stones', 0.7, 0.5)
    beginDrag(world, other, 0.7, 0.5)
    updateDrag(world, rock.x, rock.y - 0.025)
    expect(other.parentUid).toBeNull()
  })

  it('moving the parent moves the child; dragging the child beyond the radius unmounts it', async () => {
    const { syncChildren } = await import('@/engine/simulation/tick')
    const rock = place('river_stones', 0.4, 0.6)
    const plant = place('peacock_fern', 0.7, 0.5)
    beginDrag(world, plant, 0.7, 0.5)
    updateDrag(world, rock.x, rock.y - 0.025)
    endDrag(world)
    expect(plant.parentUid).toBe(rock.uid)

    beginDrag(world, rock, 0.4, 0.6)
    updateDrag(world, 0.5, 0.65)
    endDrag(world)
    syncChildren(world)
    expect(plant.x).toBeCloseTo(rock.x + (plant.offsetX ?? 0))
    expect(plant.y).toBeCloseTo(rock.y + (plant.offsetY ?? 0))

    beginDrag(world, plant, plant.x, plant.y)
    updateDrag(world, plant.x + 0.2, plant.y - 0.2)
    expect(plant.parentUid).toBeNull()
    expect(world.hoveredSnapTarget).toBeNull()
  })
})

describe('applyTool', () => {
  it('mist starts a hold stroke and remembers the starting humidity; boost feeds +8 with chime', () => {
    world.env.humidity = 71
    expect(applyTool(world, 'mist', 0.5, 0.5)).toEqual({ hold: true })
    expect(world.isMisting).toBe(true)
    expect(world.mistStartHumidity).toBe(71)
    world.env.nutrients = 95
    expect(applyTool(world, 'boost', 0.5, 0.5)).toEqual({ sound: 'chime' })
    expect(world.env.nutrients).toBe(100)
  })

  it('scrub removes a mold patch and cues repot; reports a clean substrate otherwise', () => {
    world.moldPatches.push({ x: 0.5, size: 12 })
    const fx = applyTool(world, 'scrub', 0.5, 0.8)!
    expect(world.moldPatches).toHaveLength(0)
    expect(fx.sound).toBe('repot')
    const none = applyTool(world, 'scrub', 0.5, 0.8)!
    expect(none.sound).toBeUndefined()
    expect(none.toast).toMatch(/spotless/)
  })

  it('prune shrinks flora under the pointer, floors at 0.55, ignores hardscape', () => {
    const fern = place('peacock_fern', 0.5, 0.5)
    const s = fern.scale
    const fx = applyTool(world, 'prune', 0.5, 0.5)!
    expect(fx.sound).toBe('prune')
    expect(fern.scale).toBeCloseTo(s * 0.88)
    fern.scale = 0.56
    applyTool(world, 'prune', 0.5, 0.5)
    expect(fern.scale).toBe(0.55)
    expect(applyTool(world, 'prune', 0.9, 0.9)).toBeNull()
    world.items = []
    place('river_stones', 0.5, 0.5)
    expect(applyTool(world, 'prune', 0.5, 0.5)).toBeNull()
  })

  it('select is not consumed', () => {
    expect(applyTool(world, 'select', 0.5, 0.5)).toBeNull()
  })
})
