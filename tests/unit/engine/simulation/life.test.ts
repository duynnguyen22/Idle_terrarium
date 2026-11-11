import { describe, expect, it } from 'vitest'
import type { PlacedItem } from '@/data/types'
import { ensureLife, initLife, LIFE, LIFE_STEPS } from '@/engine/simulation/life'
import { createWorld } from '@/engine/world'

function item(id: string, category: PlacedItem['category'] = 'flora'): PlacedItem {
  return { uid: id, id, category, x: 0.5, y: 0.5, scale: 1, rotation: 0, flipX: false, zIndex: 1 }
}

describe('life tables', () => {
  it('covers the twelve life-cycle species with their spec values', () => {
    expect(Object.keys(LIFE)).toHaveLength(12)
    expect(LIFE.fittonia).toEqual({ kind: 'bloom', days: 8, bloom: 'small flower spikes' })
    expect(LIFE.peacock_fern).toEqual({ kind: 'frond', days: 5 })
    expect(LIFE.subwassertang).toEqual({ kind: 'moss', days: 4 })
  })

  it('lists the milestones of each kind in order', () => {
    expect(LIFE_STEPS.bloom.map((s) => [s.name, s.at])).toEqual([
      ['bud', 0.5],
      ['open', 0.68],
      ['fade', 0.9],
      ['seed', 1],
    ])
    expect(LIFE_STEPS.frond.map((s) => [s.name, s.at])).toEqual([
      ['fiddle', 0.55],
      ['frond', 1],
    ])
    expect(LIFE_STEPS.shoot).toEqual([{ name: 'tendril', at: 1 }])
    expect(LIFE_STEPS.moss).toEqual([{ name: 'spread', at: 1 }])
  })
})

describe('initLife', () => {
  it('gives a bloom plant cyc in [0, 0.45) and leaves hardscape alone', () => {
    const plant = item('fittonia')
    initLife(plant, () => 0.5)
    expect(plant.life).toEqual({ cyc: 0.225, n: 0, tendrils: 0 })
    const rock = item('river_rock', 'hardscape')
    initLife(rock, () => 0.5)
    expect(rock.life).toBeUndefined()
  })

  it('never overwrites existing life', () => {
    const plant = item('fittonia')
    plant.life = { cyc: 0.9, n: 3, tendrils: 1 }
    initLife(plant, () => 0)
    expect(plant.life).toEqual({ cyc: 0.9, n: 3, tendrils: 1 })
  })
})

describe('ensureLife', () => {
  it('initialises life on every eligible item in the world', () => {
    const w = createWorld()
    w.items.push(item('echeveria'), item('river_rock', 'hardscape'))
    ensureLife(w, () => 0.1)
    expect(w.items[0]!.life?.cyc).toBeCloseTo(0.045)
    expect(w.items[1]!.life).toBeUndefined()
  })
})
