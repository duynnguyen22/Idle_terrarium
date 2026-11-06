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
})
