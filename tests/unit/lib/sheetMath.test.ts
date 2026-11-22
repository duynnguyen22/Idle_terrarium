import { describe, expect, it } from 'vitest'
import { clampDragPx, nextTapLevel, sheetLevelPx, snapDraggedSheet } from '@/lib/sheetMath'

describe('sheetMath', () => {
  it('maps levels to pixel heights', () => {
    expect(sheetLevelPx('peek', 800)).toBe(216)
    expect(sheetLevelPx('half', 800)).toBe(432)
    expect(sheetLevelPx('full', 800)).toBe(686)
    expect(sheetLevelPx('full', 250)).toBe(200)
  })

  it('cycles the level on tap', () => {
    expect([nextTapLevel('peek'), nextTapLevel('half'), nextTapLevel('full')]).toEqual([
      'half',
      'full',
      'half',
    ])
  })

  it('snaps a dragged height to the nearest level or closes', () => {
    expect(snapDraggedSheet(133, 800)).toBe('close')
    expect(snapDraggedSheet(134, 800)).toBe('peek')
    expect(snapDraggedSheet(500, 800)).toBe('half')
    expect(snapDraggedSheet(600, 800)).toBe('full')
  })

  it('sends a tie to the earlier level', () => {
    expect(snapDraggedSheet(324, 800)).toBe('peek')
  })

  it('clamps the drag height', () => {
    expect(clampDragPx(10, 800)).toBe(60)
    expect(clampDragPx(900, 800)).toBe(686)
    expect(clampDragPx(300, 800)).toBe(300)
  })
})
