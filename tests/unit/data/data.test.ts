import { ALL_CATALOG_DEFS, CATALOG, FAUNA, FLORA, HARDSCAPE, findCatalogDef } from '@/data/catalog'
import { BIOME_PRESETS } from '@/data/presets'
import { SOUND_PRESETS } from '@/data/soundPresets'
import { DEFAULT_SUBSTRATES, LAND_LAYER_IDS, POUR_CONTAINERS, SUBSTRATE_LAYERS } from '@/data/substrates'
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
    expect(POUR_CONTAINERS).toHaveLength(8)
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
    expect(DEFAULT_SUBSTRATES.soil).toBe(34)
  })

  it('preset items reference real defs and valid parents', () => {
    for (const p of BIOME_PRESETS) {
      expect(p.terrainContour).toHaveLength(21)
      p.items.forEach((it, i) => {
        expect(findCatalogDef(it.defId)).not.toBeNull()
        if ('parentIndex' in it) expect(it.parentIndex).toBeLessThan(i)
      })
    }
    expect(BIOME_PRESETS[0].items).toHaveLength(17)
    expect(BIOME_PRESETS[0].substrates.water).toBe(45)
    expect(BIOME_PRESETS[3].substrates.sand).toBe(22)
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

describe('v6 data model', () => {
  it('substrate layers are the v6 set in order', () => {
    expect(SUBSTRATE_LAYERS.map((l) => l.id)).toEqual(['pebbles','charcoal','soil','sand','leaflitter','rivergravel','water','siphon'])
    expect(LAND_LAYER_IDS).toEqual(['pebbles','charcoal','soil','sand','leaflitter'])
    expect(DEFAULT_SUBSTRATES).toEqual({ pebbles: 12, charcoal: 5, soil: 34, sand: 0, leaflitter: 5, rivergravel: 6, water: 45 })
  })
  it('fauna carry v6 habitat data', () => {
    const crab = FAUNA.find((f) => f.id === 'vampire_crab')!
    expect(crab).toMatchObject({ habitat: 'shore', nocturnal: true, needsWater: true, preyOn: ['medaka_fish','garden_snail'], idealHumidity: [75,100], idealTemp: [22,28], baseScale: 0.8 })
    expect(FAUNA.find((f) => f.id === 'cherry_shrimp')).toMatchObject({ habitat: 'water', aquatic: true, idealTemp: [20,27], baseScale: 0.72 })
    expect(FAUNA.find((f) => f.id === 'tree_frog')).toMatchObject({ habitat: 'land', nocturnal: true, idealHumidity: [50,85], idealTemp: [20,26], baseScale: 0.95 })
    for (const f of FAUNA) expect(['water','shore','land']).toContain(f.habitat)
  })
  it('recipes use the v6 depths and pool split', () => {
    expect(BIOME_PRESETS[1]).toMatchObject({ id: 'tropical', substrates: { pebbles: 14, charcoal: 6, soil: 38, sand: 0, leaflitter: 6, rivergravel: 4, water: 0 }, waterSplit: 0, hasLid: true, toast: 'Rainforest: all land, sealed lid' })
    expect(BIOME_PRESETS[2]).toMatchObject({ id: 'paludarium', substrates: { pebbles: 12, charcoal: 5, soil: 30, sand: 0, leaflitter: 4, rivergravel: 8, water: 55 }, waterSplit: 0.45, cycleProgress: 1, hasLid: true, toast: 'Lagoon: 45% pool for fish and shrimp' })
    expect(BIOME_PRESETS[3]).toMatchObject({ id: 'desert', substrates: { pebbles: 14, charcoal: 4, soil: 16, sand: 22, leaflitter: 0, rivergravel: 4, water: 0 }, waterSplit: 0, hasLid: false, hasFogger: false, toast: 'Arid: open top, sand, no fogger' })
    const falls = BIOME_PRESETS[0]
    expect(falls).toMatchObject({ id: 'falls', substrates: { pebbles: 12, charcoal: 5, soil: 34, sand: 0, leaflitter: 5, rivergravel: 6, water: 45 }, waterSplit: 0.32, cycleProgress: 1, pumpFlow: 'gentle', toast: 'Falls Lake: 30% pool, waterfall and moss wall' })
    expect(falls.items.map((i) => i.defId)).toEqual(['moss_wall_cliff','root_slate_waterfall','golden_river_boulders','cryptanthus_pink','peacock_fern','peacock_fern','boston_fern','trailing_ivy','anubias_nana','pogostemon_star','subwassertang','frogbit_pads','cherry_shrimp','cherry_shrimp','vampire_crab','springtails','isopod'])
  })
})
