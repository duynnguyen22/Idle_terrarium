import { describe, expect, it } from 'vitest'
import { hashStr, mulberry32 } from '@/lib/rng'

describe('mulberry32', () => {
  it('is deterministic for a seed', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    const first = Array.from({ length: 5 }, () => a())
    expect(Array.from({ length: 5 }, () => b())).toEqual(first)
    expect(first).not.toEqual(Array.from({ length: 5 }, mulberry32(43)))
  })

  it('stays in [0, 1)', () => {
    const r = mulberry32(7)
    for (let i = 0; i < 1000; i++) {
      const v = r()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('hashStr', () => {
  it('is stable and differs between strings', () => {
    expect(hashStr('a:1')).toBe(hashStr('a:1'))
    expect(hashStr('a:1')).not.toBe(hashStr('a:2'))
  })

  it('returns an unsigned 32-bit integer (FNV-1a)', () => {
    expect(hashStr('')).toBe(0x811c9dc5)
    expect(hashStr('a')).toBe(0xe40c292c)
    expect(Number.isInteger(hashStr('terrarium'))).toBe(true)
    expect(hashStr('terrarium')).toBeGreaterThanOrEqual(0)
  })
})
