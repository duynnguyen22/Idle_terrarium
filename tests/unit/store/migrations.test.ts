import { describe, expect, it } from 'vitest'
import type { RoomEnv } from '@/data/types'
import { mapLegacySubstrates, migrate, sanitizeRoom } from '@/store/migrations'

describe('mapLegacySubstrates', () => {
  it('folds lavarock into pebbles and moss into soil, leaflitter starts at 0', () => {
    expect(
      mapLegacySubstrates({
        pebbles: 10,
        lavarock: 8,
        charcoal: 6,
        moss: 8,
        soil: 16,
        rivergravel: 16,
        sand: 2,
        water: 24,
      }),
    ).toEqual({
      pebbles: 18,
      charcoal: 6,
      soil: 24,
      sand: 2,
      leaflitter: 0,
      rivergravel: 16,
      water: 24,
    })
  })

  it('mapLegacySubstrates never yields NaN', () => {
    const s = mapLegacySubstrates({ moss: 'x', lavarock: undefined })
    for (const v of Object.values(s)) expect(Number.isFinite(v)).toBe(true)
  })

  it('non-finite and non-numeric depths become 0 and missing keys become 0', () => {
    expect(
      mapLegacySubstrates({
        pebbles: Infinity,
        lavarock: 4,
        soil: NaN,
        moss: 3,
        charcoal: '6',
        water: null,
      }),
    ).toEqual({
      pebbles: 4,
      charcoal: 0,
      soil: 3,
      sand: 0,
      leaflitter: 0,
      rivergravel: 0,
      water: 0,
    })
  })

  it('passes through a finite leaflitter depth from a v6-shaped record', () => {
    expect(mapLegacySubstrates({ leaflitter: 5 }).leaflitter).toBe(5)
  })
})

describe('migrate', () => {
  it('maps a v1 save into v2', () => {
    const out = migrate(
      {
        substrates: {
          pebbles: 10,
          lavarock: 8,
          charcoal: 6,
          moss: 8,
          soil: 16,
          rivergravel: 16,
          sand: 0,
          water: 24,
        },
        dayCount: 7,
      },
      1,
    )
    expect(out.substrates).toEqual({
      pebbles: 18,
      charcoal: 6,
      soil: 24,
      sand: 0,
      leaflitter: 0,
      rivergravel: 16,
      water: 24,
    })
    expect(out).toMatchObject({
      pumpFlow: 'gentle',
      waterSplit: 0.32,
      cycleProgress: 1,
      // The spec's loader defaults a missing setupDay to 1 (not dayCount), so no fresh mold window opens.
      setupDay: 1,
    })
    expect(out.dayCount).toBe(7)
  })

  it('a v1 save with no water gets no pool', () => {
    expect(migrate({ substrates: { water: 0 }, dayCount: 1 }, 1).waterSplit).toBe(0)
  })

  it('water at the 4 mm threshold gets no pool, just above gets one', () => {
    expect(migrate({ substrates: { water: 4 } }, 1).waterSplit).toBe(0)
    expect(migrate({ substrates: { water: 4.5 } }, 1).waterSplit).toBe(0.32)
  })

  it('keeps unrelated persisted fields', () => {
    expect(migrate({ vessel: 'wardian', hasLid: false, dayCount: 3 }, 1)).toMatchObject({
      vessel: 'wardian',
      hasLid: false,
      dayCount: 3,
    })
  })

  it('leaves substrates absent when the save has none and defaults setupDay to 1', () => {
    const out = migrate({}, 1)
    expect(out).not.toHaveProperty('substrates')
    expect(out).toMatchObject({
      pumpFlow: 'gentle',
      waterSplit: 0.32,
      cycleProgress: 1,
      setupDay: 1,
    })
  })

  it('v0 (unversioned) saves share the v1 shape and migrate the same way', () => {
    expect(migrate({ substrates: { lavarock: 2, moss: 1 }, dayCount: 3 }, 0)).toMatchObject({
      substrates: { pebbles: 2, soil: 1 },
      setupDay: 1,
    })
  })

  it('v2 → v3 adds room, backdrop, haze and mineralSpots defaults', () => {
    const out = migrate({ vessel: 'globe', substrates: {} }, 2) as Record<string, unknown>
    expect(out.room).toEqual({
      water: 'tap_treated',
      tds: 180,
      ph: 7.2,
      air: 'clean',
      purifier: false,
    })
    expect(out).toMatchObject({
      vessel: 'globe',
      backdrop: 'none',
      backdropHaze: 35,
      mineralSpots: 0,
    })
  })

  it('a v1 save runs through both steps', () => {
    expect(migrate({ substrates: { water: 0 } }, 1)).toMatchObject({
      setupDay: 1,
      room: { water: 'tap_treated' },
      backdrop: 'none',
    })
  })

  it('returns v3 state unchanged', () => {
    const v3 = {
      substrates: { pebbles: 1 },
      room: { water: 'ro', tds: 90, ph: 6.6, air: 'smoke', purifier: true },
      backdrop: 'karst',
      backdropHaze: 10,
      mineralSpots: 3,
    }
    expect(migrate(v3, 3)).toEqual(v3)
  })

  it('clamps an out-of-range room on migrate', () => {
    const out = migrate(
      { room: { water: 'ro', tds: 9000, ph: 2, air: 'clean', purifier: true } },
      3,
    ) as {
      room: RoomEnv
    }
    expect(out.room).toMatchObject({ tds: 600, ph: 5.5 })
  })

  it('returns non-object persisted values as an empty object', () => {
    expect(migrate(null, 1)).toEqual({})
    expect(migrate('x', 1)).toEqual({})
  })
})

describe('sanitizeRoom', () => {
  it('falls back to defaults for unknown ids and junk values', () => {
    expect(sanitizeRoom({ water: 'lava', tds: 'x', ph: NaN, air: 7, purifier: 'yes' })).toEqual({
      water: 'tap_treated',
      tds: 180,
      ph: 7.2,
      air: 'clean',
      purifier: false,
    })
  })

  it('returns the defaults for a non-object', () => {
    expect(sanitizeRoom(null)).toEqual({
      water: 'tap_treated',
      tds: 180,
      ph: 7.2,
      air: 'clean',
      purifier: false,
    })
  })

  it('keeps valid values', () => {
    const room: RoomEnv = { water: 'rain', tds: 300, ph: 6.9, air: 'voc', purifier: true }
    expect(sanitizeRoom(room)).toEqual(room)
  })
})
