import { describe, expect, it } from 'vitest'
import { restoreWorld, snapshotWorld } from '@/engine/persistence'
import { createWorld } from '@/engine/world'
import type { PlacedItem } from '@/data/types'

describe('world persistence', () => {
  it('createWorld has a 21-point contour', () => {
    expect(createWorld().terrainContour.length).toBe(21)
  })

  it('snapshot/restore round-trips and never carries particles', () => {
    const w = createWorld()
    const item: PlacedItem = {
      uid: 'a',
      id: 'fern',
      category: 'flora',
      x: 1,
      y: 2,
      scale: 1,
      rotation: 0,
      flipX: false,
      zIndex: 1,
    }
    w.items.push(item)
    w.terrainContour[3] = 5
    w.fireflies.push({ x: 1 })
    const snap = snapshotWorld(w)
    expect(snap).not.toHaveProperty('fireflies')
    const w2 = createWorld()
    restoreWorld(w2, snap)
    expect(w2.items).toEqual(w.items)
    expect(w2.items[0]).not.toBe(item)
    expect(w2.terrainContour).toEqual(w.terrainContour)
    expect(w2.fireflies).toEqual([])
  })

  it('restoreWorld seeds ecoTime from dayCount when the snapshot has none, and keeps a valid one', () => {
    const w = createWorld()
    restoreWorld(w, { items: [], terrainContour: [] }, 12)
    expect(w.ecoTime).toBe(11)
    restoreWorld(w, { items: [], terrainContour: [], ecoTime: 3.5 }, 12)
    expect(w.ecoTime).toBe(3.5)
    restoreWorld(w, { items: [], terrainContour: [], ecoTime: 0 }, 12)
    expect(w.ecoTime).toBe(0)
    restoreWorld(w, { items: [], terrainContour: [], ecoTime: -2 }, 12)
    expect(w.ecoTime).toBe(11)
    restoreWorld(w, { items: [], terrainContour: [], ecoTime: Number.NaN }, 4)
    expect(w.ecoTime).toBe(3)
    restoreWorld(w, { items: [], terrainContour: [] })
    expect(w.ecoTime).toBe(0)
  })

  it('restoreWorld clears stale surface grains when the snapshot has none', () => {
    const w = createWorld()
    w.surfaceGrains.push({ x: 0.5 })
    restoreWorld(w, { items: [], terrainContour: [] })
    expect(w.surfaceGrains).toEqual([])
  })

  it('snapshot round-trips mossTufts, ecoTime and breed', () => {
    const w = createWorld()
    w.mossTufts.push({ x: 0.4, r: 0.02, w: 0.5, seed: 7 })
    w.ecoTime = 12.5
    w.breed = { shrimp: 3 }
    const snap = snapshotWorld(w)
    const w2 = createWorld()
    restoreWorld(w2, snap)
    expect(w2.mossTufts).toEqual(w.mossTufts)
    expect(w2.mossTufts[0]).not.toBe(w.mossTufts[0])
    expect(w2.ecoTime).toBe(12.5)
    expect(w2.breed).toEqual({ shrimp: 3 })
  })

  it('restoreWorld falls back to defaults for an old snapshot', () => {
    const w = createWorld()
    w.mossTufts.push({ x: 0.4, r: 0.02, w: 0.5, seed: 7 })
    w.ecoTime = 9
    w.breed = { shrimp: 1 }
    restoreWorld(w, { items: [], terrainContour: [] })
    expect(w.mossTufts).toEqual([])
    expect(w.ecoTime).toBe(0)
    expect(w.breed).toEqual({})
  })

  it('restoreWorld initialises life on old items', () => {
    const w = createWorld()
    const old: PlacedItem = {
      uid: 'f',
      id: 'fittonia',
      category: 'flora',
      x: 0.5,
      y: 0.5,
      scale: 1,
      rotation: 0,
      flipX: false,
      zIndex: 1,
    }
    restoreWorld(w, { items: [old], terrainContour: [] })
    expect(w.items[0]!.life?.cyc).toBeGreaterThanOrEqual(0)
    expect(w.items[0]!.life?.cyc).toBeLessThan(0.45)
  })
})
