import { describe, expect, it } from 'vitest'
import { ALL_CATALOG_DEFS, DECOR, DECOR_GROUPS, decorFootN, findCatalogDef } from '@/data/catalog'

describe('decor catalog', () => {
  it('has the 26 pieces of the live artifact, all category decor', () => {
    expect(DECOR).toHaveLength(26)
    expect(DECOR.every((d) => d.category === 'decor')).toBe(true)
    expect(findCatalogDef('deco_cottage')?.category).toBe('decor')
  })
  it('keeps catalog ids unique', () => {
    const ids = ALL_CATALOG_DEFS.map((d) => d.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
  it('groups every piece once, in spec order', () => {
    expect(DECOR_GROUPS.map((g) => [g.label, g.ids.length])).toEqual([
      ['Village and garden', 9],
      ['Japanese garden', 3],
      ['Little people', 4],
      ['Animals', 7],
      ['Mushrooms and lights', 3],
    ])
    expect(DECOR_GROUPS.flatMap((g) => g.ids)).toEqual(DECOR.map((d) => d.id))
  })
  it('gives the four glowing pieces their anchor and radius', () => {
    const glow = DECOR.filter((d) => d.glowsAtNight).map((d) => [d.id, d.glowAt, d.glowR])
    expect(glow).toEqual([
      ['deco_cottage', [8, 15], 0.32],
      ['deco_street_lamp', [0, -46], 0.36],
      ['deco_glow_mushrooms', [0, 14], 0.4],
      ['deco_firefly_jar', [0, 8], 0.36],
    ])
  })
  it('measures the foot lift in normalized units', () => {
    expect(decorFootN(1)).toBeCloseTo(0.0421875, 7)
    expect(decorFootN(1.55)).toBeCloseTo(0.065390625, 7)
  })
})
