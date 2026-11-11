import { describe, expect, it } from 'vitest'
import { findCatalogDef } from '@/data/catalog'
import type { PlacedItem } from '@/data/types'
import type { EventKind, LifeEvent } from '@/engine/simulation/life'
import { PHASES, phaseAt } from '@/engine/simulation/phases'
import { PACES } from '@/engine/simulation/pace'
import {
  buildReport,
  DOT_COLOURS,
  dotColour,
  durationLabel,
  etaLabel,
  EVENT_ORDER,
  eventText,
  NOTABLE,
  restLine,
  sinceLabel,
  upcomingHints,
} from '@/engine/simulation/report'
import { createWorld } from '@/engine/world'

const name = (id: string): string => findCatalogDef(id)?.name ?? id
const ev = (kind: EventKind, uid: string, id = 'fittonia'): LifeEvent => ({ kind, uid, id })

function plant(uid: string, id: string, cyc: number, extra: Partial<PlacedItem> = {}): PlacedItem {
  return {
    uid,
    id,
    category: 'flora',
    x: 0.5,
    y: 0.5,
    scale: 1,
    rotation: 0,
    flipX: false,
    zIndex: 1,
    life: { cyc, n: 0, tendrils: 0 },
    ...extra,
  }
}

describe('eventText', () => {
  it('fills name and bloom word', () => {
    expect(eventText('open', 'fittonia')).toBe(
      `The ${name('fittonia')} opened small flower spikes.`,
    )
  })

  it('has the spec sentence for every kind', () => {
    const n = name('peacock_fern')
    expect(eventText('bud', 'peacock_fern')).toBe(`The ${n} is forming buds.`)
    expect(eventText('fade', 'peacock_fern')).toBe(`The ${n}'s flowers faded.`)
    expect(eventText('seedling', 'peacock_fern')).toBe(`A ${n} seedling came up.`)
    expect(eventText('fiddle', 'peacock_fern')).toBe(`The ${n} is unfurling a new frond.`)
    expect(eventText('frond', 'peacock_fern')).toBe(`The ${n} put out a new frond.`)
    expect(eventText('tendril', 'peacock_fern')).toBe(`The ${n} sent out a runner.`)
    expect(eventText('spread', 'peacock_fern')).toBe(`The ${n} spread a little.`)
    expect(eventText('grown', 'peacock_fern')).toBe(`The ${n} seedling filled out.`)
    expect(eventText('hatch', 'peacock_fern')).toBe(`The ${n} had young.`)
  })
})

describe('tables', () => {
  it('marks the notable kinds', () => {
    const on = (Object.keys(NOTABLE) as EventKind[]).filter((k) => NOTABLE[k] === 1).sort()
    expect(on).toEqual(
      ['open', 'seedling', 'hatch', 'frond', 'bud', 'spread', 'tendril', 'grown'].sort(),
    )
    expect([NOTABLE.fiddle, NOTABLE.fade, NOTABLE.rest]).toEqual([0, 0, 0])
  })

  it('orders kinds as the spec lists them', () => {
    expect(EVENT_ORDER).toEqual([
      'open',
      'seedling',
      'hatch',
      'frond',
      'bud',
      'spread',
      'tendril',
      'grown',
      'fiddle',
      'fade',
      'rest',
    ])
  })

  it('uses the spec dot colours, and the default for every other kind', () => {
    const expected: Record<string, string> = {
      open: '#e0789f',
      bud: '#e0789f',
      fade: '#e0789f',
      hatch: '#c2853f',
      rest: '#9aa79d',
      seedling: '#a3cf4f',
      grown: '#a3cf4f',
      fiddle: '#65a33a',
      frond: '#65a33a',
      tendril: '#65a33a',
      spread: '#65a33a',
      seed: '#65a33a',
    }
    for (const [kind, colour] of Object.entries(expected)) expect(dotColour(kind)).toBe(colour)
    expect(DOT_COLOURS.default).toBe('#65a33a')
  })
})

describe('phases', () => {
  it('finds the phase containing cyc, and the last at 1', () => {
    expect(phaseAt('bloom', 0).name).toBe('Leafy growth')
    expect(phaseAt('bloom', 0.5).name).toBe('In bud')
    expect(phaseAt('bloom', 0.679).name).toBe('In bud')
    expect(phaseAt('bloom', 0.68).name).toBe('Flowering')
    expect(phaseAt('bloom', 1).name).toBe('Setting seed')
    expect(phaseAt('frond', 0.6).next).toBe('the frond opens')
    expect(PHASES.moss).toHaveLength(1)
  })
})

describe('buildReport', () => {
  it('drops bud when the same uid opened and fiddle when it fronded', () => {
    const r = buildReport(
      [
        ev('bud', 'a'),
        ev('open', 'a'),
        ev('bud', 'b', 'echeveria'),
        ev('fiddle', 'c', 'peacock_fern'),
        ev('frond', 'c', 'peacock_fern'),
        ev('fiddle', 'd', 'boston_fern'),
      ],
      [],
    )
    expect(r.items.map((i) => `${i.kind}|${i.uid}`)).toEqual([
      'open|a',
      'frond|c',
      'bud|b',
      'fiddle|d',
    ])
    expect(r.more).toBe(0)
  })

  it('groups by kind and species, counting occurrences with the first uid', () => {
    const r = buildReport([ev('seedling', 's1'), ev('seedling', 's2'), ev('seedling', 's3')], [])
    expect(r.items).toEqual([
      {
        kind: 'seedling',
        uid: 's1',
        id: 'fittonia',
        text: `A ${name('fittonia')} seedling came up.`,
        count: 3,
      },
    ])
  })

  it('takes one of each kind before repeats', () => {
    const r = buildReport(
      [
        ev('seedling', 's1'),
        ev('seedling', 's2', 'echeveria'),
        ev('open', 'o1'),
        ev('hatch', 'h1', 'moss_mound'),
      ],
      ['x'],
    )
    expect(r.items.map((i) => i.kind)).toEqual(['open', 'seedling', 'hatch'])
    expect(r.items[1].id).toBe('fittonia')
    expect(r.more).toBe(1)
  })

  it('keeps 4 lines without rest, 3 with rest, and counts more', () => {
    const events = [
      ev('open', 'a'),
      ev('seedling', 'b'),
      ev('hatch', 'c'),
      ev('frond', 'd'),
      ev('bud', 'e'),
      ev('spread', 'f'),
    ]
    const plain = buildReport(events, [])
    expect(plain.items).toHaveLength(4)
    expect(plain.more).toBe(2)
    expect(plain.rest).toEqual([])
    const rested = buildReport(events, ['Fittonia'])
    expect(rested.items).toHaveLength(3)
    expect(rested.more).toBe(3)
    expect(rested.rest).toEqual(['Fittonia'])
  })
})

describe('restLine', () => {
  it('uses "it" for one name and "them" for two', () => {
    expect(restLine(['Fittonia'])).toBe(
      'The Fittonia slowed down to rest. A mist or a drink will wake it.',
    )
    expect(restLine(['Fittonia', 'Echeveria'])).toBe(
      'The Fittonia and Echeveria slowed down to rest. A mist or a drink will wake them.',
    )
  })
})

describe('labels', () => {
  it('durationLabel: 0.5 h → "30 min", 5 h → "5 h", 48 h → "2 days"', () => {
    expect(durationLabel(0.5)).toBe('30 min')
    expect(durationLabel(5)).toBe('5 h')
    expect(durationLabel(35.4)).toBe('35 h')
    expect(durationLabel(48)).toBe('2 days')
  })

  it('etaLabel at garden pace', () => {
    const p = PACES.garden
    expect(etaLabel(0.0005, p)).toBe('in a minute or so')
    expect(etaLabel(0.1, p)).toBe('in about 12 min')
    expect(etaLabel(2, p)).toBe('in about 4 h')
    expect(etaLabel(1.3, p)).toBe('in about 2.6 h')
    expect(etaLabel(6, p)).toBe('in about 12 h')
    expect(etaLabel(20, p)).toBe('in about 2 days')
  })

  it('sinceLabel says today / last night / yesterday / weekday', () => {
    const now = new Date(2026, 10, 11, 14, 30).getTime() // Wednesday
    const at = (d: number, h: number, m: number) => new Date(2026, 10, d, h, m).getTime()
    expect(sinceLabel(at(11, 9, 5), now)).toBe('today at 09:05')
    expect(sinceLabel(at(10, 18, 20), now)).toBe('last night at 18:20')
    expect(sinceLabel(at(10, 10, 0), now)).toBe('yesterday at 10:00')
    expect(sinceLabel(at(8, 8, 0), now)).toBe('Sunday at 08:00')
  })
})

describe('upcomingHints', () => {
  const lamp = { hasGrowLamp: true }

  it('puts an open first then the soonest, one per species', () => {
    const world = createWorld()
    world.items.push(
      plant('fit1', 'fittonia', 0.55),
      plant('fit2', 'fittonia', 0.1),
      plant('ech', 'echeveria', 0.6),
      plant('fern', 'peacock_fern', 0.5),
      plant('rock', 'moss_mound', 0.2, { life: undefined }),
    )
    const two = upcomingHints(world, lamp)
    expect(two.map((h) => h.uid)).toEqual(['ech', 'fern'])
    expect(two[0].text).toBe(`${name('echeveria')}: buds open`)
    expect(two[0].eta).toBeCloseTo((0.68 - 0.6) * 12, 6)
    expect(two[1].text).toBe(`${name('peacock_fern')}: a new frond appears`)
    expect(two[1].eta).toBeCloseTo(0.05 * 5, 6)
    const all = upcomingHints(world, lamp, 10)
    expect(all.map((h) => h.uid)).toEqual(['ech', 'fern', 'fit1'])
  })

  it('skips resting, struggling and young items, and slows blooms without a lamp', () => {
    const world = createWorld()
    world.items.push(
      plant('rest', 'echeveria', 0.6, { resting: true }),
      plant('weak', 'fittonia', 0.6, { vitality: 40 }),
      plant('kid', 'boston_fern', 0.6, { baby: 0 }),
      plant('pogo', 'pogostemon_star', 0.6),
    )
    const lit = upcomingHints(world, lamp, 5)
    expect(lit.map((h) => h.uid)).toEqual(['pogo'])
    const dim = upcomingHints(world, { hasGrowLamp: false }, 5)
    expect(dim[0].eta).toBeCloseTo(lit[0].eta * 2, 6)
  })
})
