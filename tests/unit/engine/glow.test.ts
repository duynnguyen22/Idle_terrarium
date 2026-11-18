import { describe, expect, it } from 'vitest'
import { findCatalogDef } from '@/data/catalog'
import { drawNightGlow } from '@/engine/render/glow'

function run(id: string, lighting: 'sunlight' | 'twilight' | 'night') {
  const calls: number[][] = []
  const arcs: number[][] = []
  const ctx = {
    createRadialGradient: (...a: number[]) => {
      calls.push(a)
      return { addColorStop() {} }
    },
    beginPath() {},
    arc: (...a: number[]) => arcs.push(a),
    fill() {},
  } as unknown as CanvasRenderingContext2D
  const def = findCatalogDef(id)
  if (!def) throw new Error(`missing ${id}`)
  drawNightGlow(ctx, { lighting }, def, 256)
  return { calls, arcs }
}

describe('drawNightGlow', () => {
  it('lights a glowing hardscape piece at night', () => {
    expect(run('quartz', 'night').calls).toEqual([[0, 0, 2, 0, 0, 256 * 0.65]])
  })
  it('shrinks the hardscape glow at twilight', () => {
    expect(run('quartz', 'twilight').calls).toEqual([[0, 0, 2, 0, 0, 256 * 0.65 * 0.8]])
  })
  it('places the street lamp glow by glowAt and glowR', () => {
    const { calls, arcs } = run('deco_street_lamp', 'night')
    expect(calls).toEqual([[0, -92, 2, 0, -92, 256 * 0.36]])
    expect(arcs[0].slice(0, 3)).toEqual([0, -92, 256 * 0.36])
  })
  it('places the cottage glow at twilight', () => {
    expect(run('deco_cottage', 'twilight').calls).toEqual([[16, 30, 2, 16, 30, 256 * 0.32 * 0.8]])
  })
  it('draws nothing in sunlight or for non-glowing pieces', () => {
    expect(run('quartz', 'sunlight').calls).toEqual([])
    expect(run('deco_bench', 'night').calls).toEqual([])
  })
})
