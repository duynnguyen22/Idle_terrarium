import { describe, expect, it } from 'vitest'
import type { MossTuft, PlacedItem } from '@/data/types'
import { mossCover, spreadMoss } from '@/engine/simulation/moss'
import { createWorld } from '@/engine/world'

const parent: PlacedItem = {
  uid: 'm',
  id: 'moss_mound',
  category: 'flora',
  x: 0.5,
  y: 0.7,
  scale: 1,
  rotation: 0,
  flipX: false,
  zIndex: 1,
}

describe('spreadMoss', () => {
  it('widens a nearby tuft when rng < 0.6', () => {
    const w = createWorld()
    w.mossTufts = [{ x: 0.55, r: 0.5, w: 0.05, seed: 0.1 }]
    spreadMoss(w, parent, () => 0.3)
    expect(w.mossTufts).toHaveLength(1)
    expect(w.mossTufts[0]!.r).toBeCloseTo(0.7)
  })

  it('adds a tuft when none is nearby or the roll fails', () => {
    const w = createWorld()
    w.mossTufts = [{ x: 0.2, r: 0.5, w: 0.05, seed: 0.1 }]
    spreadMoss(w, parent, () => 0.5)
    expect(w.mossTufts).toHaveLength(2)
    expect(w.mossTufts[1]).toEqual({ x: 0.5, r: 0.35, w: 0.055, seed: 0.5 })

    const w2 = createWorld()
    w2.mossTufts = [{ x: 0.5, r: 0.5, w: 0.05, seed: 0.1 }]
    spreadMoss(w2, parent, () => 0.7)
    expect(w2.mossTufts).toHaveLength(2)
    expect(w2.mossTufts[0]!.r).toBe(0.5)
  })

  it('ignores a nearby tuft that is already at r 1', () => {
    const w = createWorld()
    w.mossTufts = [{ x: 0.5, r: 1, w: 0.05, seed: 0.1 }]
    spreadMoss(w, parent, () => 0.3)
    expect(w.mossTufts).toHaveLength(2)
  })

  it('widens a random tuft at 18 instead of adding', () => {
    const w = createWorld()
    w.mossTufts = Array.from({ length: 18 }, (_, i) => ({ x: i * 0.05, r: 1, w: 0.05, seed: 0 }))
    spreadMoss(w, parent, () => 0.5) // index floor(0.5 * 18) = 9
    expect(w.mossTufts).toHaveLength(18)
    expect(w.mossTufts[9]!.r).toBeCloseTo(1.15)
    expect(w.mossTufts.filter((t) => t.r !== 1)).toHaveLength(1)
  })
})

describe('mossCover', () => {
  it('sums r over 18', () => {
    expect(mossCover([{ x: 0, r: 9, w: 0, seed: 0 }])).toBe(50)
  })
  it('caps at 100 and is 0 for no tufts', () => {
    const t: MossTuft = { x: 0, r: 30, w: 0, seed: 0 }
    expect(mossCover([t])).toBe(100)
    expect(mossCover([])).toBe(0)
  })
})
