import { beforeEach, describe, expect, it } from 'vitest'
import { importPrototypeSave } from '@/store/importPrototypeSave'

const KEY = 'existence_botanica_paludarium_v5'
beforeEach(() => localStorage.clear())

describe('importPrototypeSave', () => {
  it('maps the exact prototype save shape', () => {
    const items = [{ uid: 'u1', id: 'fern', category: 'flora', x: 0.4, y: 0.5, scale: 1, rotation: 0, flipX: false, zIndex: 3 }]
    const contour = Array.from({ length: 21 }, (_, i) => i)
    localStorage.setItem(KEY, JSON.stringify({
      vessel: 'paludarium_tank', hasLid: false, hasGrowLamp: true, hasFogger: false,
      substrates: { pebbles: 1, lavarock: 2, charcoal: 3, moss: 4, soil: 5, rivergravel: 6, sand: 7, water: 8 },
      terrainContour: contour, surfaceGrains: [{ x: 1 }], items, dayCount: 12,
      humidity: 50, soilMoisture: 60, nutrients: 70, lastSavedTimestamp: 1,
    }))
    const r = importPrototypeSave(localStorage)
    expect(r).toMatchObject({
      vessel: 'paludarium_tank', hasLid: false, hasGrowLamp: true, hasFogger: false, dayCount: 12,
      substrates: { pebbles: 1, lavarock: 2, charcoal: 3, moss: 4, soil: 5, rivergravel: 6, sand: 7, water: 8 },
    })
    expect(r?.worldSnapshot?.items).toEqual(items)
    expect(r?.worldSnapshot?.terrainContour).toEqual(contour)
    expect(r?.worldSnapshot?.substrateGrains).toEqual([{ x: 1 }])
    expect(localStorage.getItem(KEY)).not.toBeNull()
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
    localStorage.setItem(KEY, JSON.stringify({ vessel: 'nope', terrainContour: [1], items: [{ uid: 'a' }], dayCount: 0 }))
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
})
