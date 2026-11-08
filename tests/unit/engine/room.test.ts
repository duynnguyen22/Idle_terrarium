import { describe, expect, it } from 'vitest'
import { DEFAULT_ROOM, envModel, qualityTier, qualityWord } from '@/engine/room'

describe('envModel', () => {
  it('defaults score 100 water and 100 air with the lid sealed', () => {
    const m = envModel(DEFAULT_ROOM, true)
    expect(m.water).toBe(100 - 0 - 0 - Math.max(0, Math.abs(7.2 - 7) - 0.5) * 22)
    expect(m.water).toBe(100)
    expect(m.airEff).toBe(100)
  })

  it('untreated tap water loses 45 points to chlorine', () => {
    expect(envModel({ ...DEFAULT_ROOM, water: 'tap' }, true).water).toBe(55)
  })

  it('RO fixes tds to 8 and pH to 6.6; rain to 20 and 6.2', () => {
    expect(envModel({ ...DEFAULT_ROOM, water: 'ro' }, true)).toMatchObject({ tds: 8, ph: 6.6 })
    expect(envModel({ ...DEFAULT_ROOM, water: 'rain' }, true)).toMatchObject({ tds: 20, ph: 6.2 })
  })

  it('carbon filtering scales tds by 0.85', () => {
    expect(envModel({ ...DEFAULT_ROOM, water: 'filtered', tds: 200 }, true).tds).toBe(170)
  })

  it('a sealed lid keeps out 55% of smoke; a purifier adds 28 for particles', () => {
    expect(envModel({ ...DEFAULT_ROOM, air: 'smoke' }, true).airEff).toBe(
      Math.round(100 - 58 * 0.45),
    )
    expect(envModel({ ...DEFAULT_ROOM, air: 'smoke' }, false).airEff).toBe(42)
    expect(envModel({ ...DEFAULT_ROOM, air: 'smoke', purifier: true }, false).airEff).toBe(70)
  })

  it('a purifier adds 10 for fumes and nothing for clean air', () => {
    expect(envModel({ ...DEFAULT_ROOM, air: 'voc', purifier: true }, false).airRaw).toBe(48)
    expect(envModel({ ...DEFAULT_ROOM, purifier: true }, false).airRaw).toBe(100)
  })

  it('rain collected in polluted air loses 15 more', () => {
    expect(envModel({ ...DEFAULT_ROOM, water: 'rain', air: 'voc' }, false).water).toBe(
      Math.round(Math.max(5, 100 - 0 - 0 - Math.max(0, Math.abs(6.2 - 7) - 0.5) * 22 - 15)),
    )
  })

  it('water quality is clamped to 5..100', () => {
    expect(envModel({ ...DEFAULT_ROOM, water: 'tap', tds: 600, ph: 8.5 }, true).water).toBe(5)
  })

  it('reports the air kind', () => {
    expect(envModel({ ...DEFAULT_ROOM, air: 'aerosol' }, true).kind).toBe('toxic')
  })
})

describe('quality', () => {
  it('qualityWord thresholds', () => {
    expect([qualityWord(80), qualityWord(79), qualityWord(59), qualityWord(39)]).toEqual([
      'Good',
      'Fair',
      'Poor',
      'Harmful',
    ])
  })

  it('qualityTier thresholds', () => {
    expect([qualityTier(80), qualityTier(79), qualityTier(60), qualityTier(59)]).toEqual([
      'good',
      'fair',
      'fair',
      'bad',
    ])
  })
})
