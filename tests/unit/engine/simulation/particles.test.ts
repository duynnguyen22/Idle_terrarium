import { describe, expect, it } from 'vitest'
import { LEAF_TTL } from '@/engine/simulation/life'
import { updateAmbientMotes } from '@/engine/simulation/particles'
import { createWorld } from '@/engine/world'

const FRAME = 1000 / 60

describe('updateAmbientMotes', () => {
  it('wraps a regular mote below the floor back to the top', () => {
    const w = createWorld()
    w.ambientMotes = [{ type: 'dust', x: 0.5, y: 0.85, vx: 0, vy: 0, r: 1, phase: 0 }]
    updateAmbientMotes(w, FRAME)
    expect(w.ambientMotes[0]!.y).toBe(0.18)
  })

  it('does not wrap a falling leaf and removes it once its ttl is spent', () => {
    const w = createWorld()
    w.ambientMotes = [{ type: 'leaf', x: 0.5, y: 0.85, vx: 0, vy: 0, r: 1.6, ttl: LEAF_TTL }]
    updateAmbientMotes(w, FRAME)
    expect(w.ambientMotes).toHaveLength(1)
    expect(w.ambientMotes[0]!.y).toBe(0.85)
    for (let i = 0; i < LEAF_TTL; i++) updateAmbientMotes(w, FRAME)
    expect(w.ambientMotes).toHaveLength(0)
  })

  it('removes a leaf that falls below y 0.95', () => {
    const w = createWorld()
    w.ambientMotes = [{ type: 'leaf', x: 0.5, y: 0.949, vx: 0, vy: 0.01, r: 1.6, ttl: LEAF_TTL }]
    updateAmbientMotes(w, FRAME)
    expect(w.ambientMotes).toHaveLength(0)
  })
})
