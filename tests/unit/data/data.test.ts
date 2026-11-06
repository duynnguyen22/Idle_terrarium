import { ALL_CATALOG_DEFS, CATALOG, FAUNA, FLORA, HARDSCAPE, findCatalogDef } from '@/data/catalog'
import { BIOME_PRESETS } from '@/data/presets'
import { SOUND_PRESETS } from '@/data/soundPresets'
import { DEFAULT_SUBSTRATES, POUR_CONTAINERS, SUBSTRATE_LAYERS } from '@/data/substrates'
import { VESSELS, VESSELS_BY_ID } from '@/data/vessels'
import { createItemId } from '@/lib/ids'
import { formatClock, formatDepthMm } from '@/lib/format'
import { clamp } from '@/lib/clamp'

describe('catalog data', () => {
  it('has prototype counts', () => {
    expect(FLORA).toHaveLength(12)
    expect(HARDSCAPE).toHaveLength(10)
    expect(FAUNA).toHaveLength(8)
    expect(CATALOG.flora).toBe(FLORA)
    expect(VESSELS).toHaveLength(6)
    expect(POUR_CONTAINERS).toHaveLength(9)
    expect(BIOME_PRESETS).toHaveLength(4)
    expect(SOUND_PRESETS.map((s) => s.id)).toEqual(['stream', 'rain', 'forest', 'night'])
  })

  it('has unique ids and category-matching defs', () => {
    const ids = ALL_CATALOG_DEFS.map((d) => d.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(FLORA.every((d) => d.category === 'flora')).toBe(true)
    expect(FAUNA.every((d) => d.category === 'fauna')).toBe(true)
  })

  it('keeps every mountPoint offset within [-0.5, 0.5] and rigid fields verbatim', () => {
    const withMounts = HARDSCAPE.filter((d) => 'mountPoints' in d)
    expect(withMounts).toHaveLength(7)
    for (const d of withMounts) {
      for (const p of d.mountPoints) {
        expect(Math.abs(p.ox)).toBeLessThanOrEqual(0.5)
        expect(Math.abs(p.oy)).toBeLessThanOrEqual(0.5)
      }
    }
    expect(findCatalogDef('moss_wall_cliff')).toMatchObject({ baseScale: 1.75 })
    expect(findCatalogDef('springtails')).toMatchObject({ speed: 0.45, moldEatRate: 2.2 })
    expect(findCatalogDef('nope')).toBeNull()
  })

  it('looks up vessels and substrates', () => {
    expect(VESSELS_BY_ID.globe.evapMultiplier).toBe(0.7)
    expect(SUBSTRATE_LAYERS.map((l) => l.id).slice(-2)).toEqual(['water', 'siphon'])
    expect(DEFAULT_SUBSTRATES.soil).toBe(16)
  })

  it('preset items reference real defs and valid parents', () => {
    for (const p of BIOME_PRESETS) {
      expect(p.terrainContour).toHaveLength(21)
      p.items.forEach((it, i) => {
        expect(findCatalogDef(it.defId)).not.toBeNull()
        if ('parentIndex' in it) expect(it.parentIndex).toBeLessThan(i)
      })
    }
    expect(BIOME_PRESETS[0].items).toHaveLength(15)
    expect(BIOME_PRESETS[0].substrates.water).toBe(26)
    expect(BIOME_PRESETS[3].substrates.sand).toBe(28)
  })
})

describe('lib helpers', () => {
  it('createItemId matches prototype shape', () => {
    expect(createItemId()).toMatch(/^item_[a-z0-9]{1,7}$/)
    expect(createItemId()).not.toBe(createItemId())
  })
  it('clamp and format', () => {
    expect(clamp(5, 0, 1)).toBe(1)
    expect(clamp(-5, 0, 1)).toBe(0)
    expect(formatClock(new Date(2024, 0, 1, 3, 4, 5))).toBe('03:04:05')
    expect(formatDepthMm(15.6)).toBe('16 mm')
  })
})
