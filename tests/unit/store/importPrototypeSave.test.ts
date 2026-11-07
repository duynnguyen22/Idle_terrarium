import { beforeEach, describe, expect, it } from 'vitest'
import { importPrototypeSave } from '@/store/importPrototypeSave'

const KEY = 'existence_botanica_paludarium_v5'
const V6_KEY = 'botanica_paludarium_v6'
beforeEach(() => localStorage.clear())

describe('importPrototypeSave', () => {
  it('maps the exact prototype save shape', () => {
    const items = [{ uid: 'u1', id: 'fern', category: 'flora', x: 0.4, y: 0.5, scale: 1, rotation: 0, flipX: false, zIndex: 3 }]
    const contour = Array.from({ length: 21 }, (_, i) => i)
    localStorage.setItem(KEY, JSON.stringify({
      vessel: 'paludarium_tank', hasLid: false, hasGrowLamp: true, hasFogger: false,
      substrates: { pebbles: 1, charcoal: 2, soil: 3, sand: 4, leaflitter: 5, rivergravel: 6, water: 7 },
      terrainContour: contour, surfaceGrains: [{ x: 1 }], items, dayCount: 12,
      humidity: 50, soilMoisture: 60, nutrients: 70, lastSavedTimestamp: 1,
    }))
    const r = importPrototypeSave(localStorage)
    expect(r).toMatchObject({
      vessel: 'paludarium_tank', hasLid: false, hasGrowLamp: true, hasFogger: false, dayCount: 12,
      substrates: { pebbles: 1, charcoal: 2, soil: 3, sand: 4, leaflitter: 5, rivergravel: 6, water: 7 },
    })
    expect(r?.worldSnapshot?.items).toEqual(items)
    expect(r?.worldSnapshot?.terrainContour).toEqual(contour)
    expect(r?.worldSnapshot?.substrateGrains).toEqual([{ x: 1 }])
    // Saved gauges seed the environment; the missing temperature keeps its default.
    expect(r?.envSeed).toEqual({ humidity: 50, temperature: 24.5, soilMoisture: 60, nutrients: 70 })
    expect(localStorage.getItem(KEY)).not.toBeNull()
  })

  it('maps the v6 saved gauges onto envSeed, rounding and defaulting bad values', () => {
    localStorage.setItem(V6_KEY, JSON.stringify({ items: [{ uid: 'a', id: 'fern' }], humidity: 64.27, temperature: 'hot', soilMoisture: null, nutrients: 30 }))
    expect(importPrototypeSave(localStorage)?.envSeed).toEqual({ humidity: 64.3, temperature: 24.5, soilMoisture: 74, nutrients: 30 })
  })

  it('returns null on garbage, missing key or empty items', () => {
    expect(importPrototypeSave(localStorage)).toBeNull()
    localStorage.setItem(KEY, '{not json')
    expect(importPrototypeSave(localStorage)).toBeNull()
    localStorage.setItem(KEY, JSON.stringify({ items: [] }))
    expect(importPrototypeSave(localStorage)).toBeNull()
    localStorage.setItem(KEY, JSON.stringify([1, 2]))
    expect(importPrototypeSave(localStorage)).toBeNull()
  })

  it('falls back to defaults for bad fields', () => {
    localStorage.setItem(KEY, JSON.stringify({ vessel: 'nope', terrainContour: [1], items: [{ uid: 'a', id: 'fern' }], dayCount: 0 }))
    const r = importPrototypeSave(localStorage)
    expect(r?.vessel).toBe('paludarium_tank')
    expect(r?.hasLid).toBe(true)
    expect(r?.dayCount).toBe(1)
    expect(r?.worldSnapshot?.terrainContour).toHaveLength(21)
  })

  it('caps imported surfaceGrains at the last 180 entries', () => {
    const grains = Array.from({ length: 200 }, (_, i) => ({ i }))
    localStorage.setItem(KEY, JSON.stringify({ items: [{ uid: 'a', id: 'fern' }], surfaceGrains: grains }))
    const g = importPrototypeSave(localStorage)?.worldSnapshot?.substrateGrains
    expect(g).toHaveLength(180)
    expect(g?.[0]).toEqual({ i: 20 })
    expect(g?.[179]).toEqual({ i: 199 })
  })

  it('returns null when no item is a valid object with string uid and id', () => {
    localStorage.setItem(KEY, JSON.stringify({ items: [null, 1, 'x', { uid: 'a' }, { id: 'b' }, { uid: 1, id: 2 }] }))
    expect(importPrototypeSave(localStorage)).toBeNull()
  })

  it('keeps only valid items from a mixed array', () => {
    const good = { uid: 'u1', id: 'fern', x: 0.1 }
    localStorage.setItem(KEY, JSON.stringify({ items: [null, good, 5, { uid: 'z' }] }))
    expect(importPrototypeSave(localStorage)?.worldSnapshot?.items).toEqual([good])
  })

  it('imports a v6 prototype save', () => {
    localStorage.setItem(V6_KEY, JSON.stringify({ items: [{ uid: 'a', id: 'isopod' }], vessel: 'wardian', pumpFlow: 'off', waterSplit: 0.4, cycleProgress: 0.2, setupDay: 3, dayCount: 5, substrates: { pebbles: 1, charcoal: 1, soil: 1, sand: 0, leaflitter: 1, rivergravel: 1, water: 10 }, terrainContour: new Array(21).fill(0) }))
    const r = importPrototypeSave(localStorage)
    expect(r).toMatchObject({ vessel: 'wardian', pumpFlow: 'off', waterSplit: 0.4, cycleProgress: 0.2, setupDay: 3, dayCount: 5 })
    expect(r?.substrates).toEqual({ pebbles: 1, charcoal: 1, soil: 1, sand: 0, leaflitter: 1, rivergravel: 1, water: 10 })
  })

  it('prefers the v6 save over the v5 save', () => {
    localStorage.setItem(KEY, JSON.stringify({ items: [{ uid: 'a', id: 'fern' }], dayCount: 9 }))
    localStorage.setItem(V6_KEY, JSON.stringify({ items: [{ uid: 'b', id: 'fern' }], dayCount: 2 }))
    expect(importPrototypeSave(localStorage)?.dayCount).toBe(2)
  })

  it('falls back to the v5 save when the v6 save is unusable', () => {
    localStorage.setItem(V6_KEY, JSON.stringify({ items: [] }))
    localStorage.setItem(KEY, JSON.stringify({ items: [{ uid: 'a', id: 'fern' }], dayCount: 9 }))
    expect(importPrototypeSave(localStorage)?.dayCount).toBe(9)
  })

  it('v6 import defaults and clamps bad pool fields', () => {
    localStorage.setItem(V6_KEY, JSON.stringify({ items: [{ uid: 'a', id: 'fern' }], pumpFlow: 'turbo', waterSplit: 2, cycleProgress: -1, setupDay: 0 }))
    expect(importPrototypeSave(localStorage)).toMatchObject({ pumpFlow: 'gentle', waterSplit: 0.6, cycleProgress: 0, setupDay: 1 })
    localStorage.setItem(V6_KEY, JSON.stringify({ items: [{ uid: 'a', id: 'fern' }], waterSplit: 'x' }))
    expect(importPrototypeSave(localStorage)).toMatchObject({ pumpFlow: 'gentle', waterSplit: 0.32, cycleProgress: 1, setupDay: 1 })
  })

  it('still imports a v5 save through the legacy substrate map', () => {
    localStorage.setItem(KEY, JSON.stringify({ items: [{ uid: 'a', id: 'isopod' }], substrates: { lavarock: 5, moss: 3, soil: 10, water: 20 } }))
    expect(importPrototypeSave(localStorage)!.substrates).toEqual({ pebbles: 5, charcoal: 0, soil: 13, sand: 0, leaflitter: 0, rivergravel: 0, water: 20 })
  })

  it('v5 import derives pool fields from its water depth', () => {
    localStorage.setItem(KEY, JSON.stringify({ items: [{ uid: 'a', id: 'fern' }], substrates: { water: 0 }, dayCount: 6 }))
    expect(importPrototypeSave(localStorage)).toMatchObject({ pumpFlow: 'gentle', waterSplit: 0, cycleProgress: 1, setupDay: 1, dayCount: 6 })
  })
})
