import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { PlacedItem } from '@/data/types'
import { registerWorld, unregisterWorld } from '@/engine/engineBridge'
import { snapshotWorld } from '@/engine/persistence'
import { DEFAULT_ROOM } from '@/engine/room'
import { createWorld, type EngineWorld } from '@/engine/world'
import {
  applyGardenSnapshot,
  gardenSummary,
  getGardenSnapshot,
  type GardenSnapshot,
} from '@/store/gardenSnapshot'
import { createStudioStore, partialize, type StudioStoreHook } from '@/store/useStudioStore'
import { DEFAULT_TELEMETRY } from '@/store/useTelemetryStore'

class MemoryStorage implements Storage {
  private map = new Map<string, string>()
  get length() {
    return this.map.size
  }
  clear() {
    this.map.clear()
  }
  getItem(key: string) {
    return this.map.has(key) ? this.map.get(key)! : null
  }
  key(index: number) {
    return [...this.map.keys()][index] ?? null
  }
  removeItem(key: string) {
    this.map.delete(key)
  }
  setItem(key: string, value: string) {
    this.map.set(key, String(value))
  }
}

const item = (uid: string, category: PlacedItem['category']): PlacedItem => ({
  uid,
  id: category === 'flora' ? 'fern' : category === 'fauna' ? 'shrimp' : 'stone',
  category,
  x: 0.5,
  y: 0.7,
  scale: 1,
  rotation: 0,
  flipX: false,
  zIndex: 1,
})

let studio: StudioStoreHook
let world: EngineWorld

beforeEach(() => {
  studio = createStudioStore(new MemoryStorage())
  world = createWorld()
})
afterEach(() => unregisterWorld())

describe('gardenSnapshot', () => {
  it('getGardenSnapshot carries the persisted slice plus a fresh world snapshot', () => {
    studio.getState().setVessel('globe')
    studio.getState().setBackdrop('karst')
    world.items = [item('a', 'flora'), item('b', 'fauna')]
    const snap = getGardenSnapshot(studio.getState(), world)
    expect(snap).toMatchObject({
      ...partialize(studio.getState()),
      worldSnapshot: snapshotWorld(world),
    })
    expect(snap.version).toBe(4)
    expect(snap.worldSnapshot?.items.map((i) => i.uid)).toEqual(['a', 'b'])
    // Without a world the stored snapshot is used as is.
    studio.getState().setWorldSnapshot({ items: [item('z', 'hardscape')], terrainContour: [] })
    expect(getGardenSnapshot(studio.getState(), null).worldSnapshot?.items[0]?.uid).toBe('z')
  })

  it('applyGardenSnapshot restores the store and the registered world', () => {
    const other = createStudioStore(new MemoryStorage())
    other.setState({
      vessel: 'globe',
      dayCount: 9,
      cycleProgress: 0.4,
      mineralSpots: 0.25,
      backdrop: 'karst',
      backdropHaze: 50,
      envSeed: { humidity: 60, temperature: 21, soilMoisture: 40, nutrients: 50 },
    })
    const source = createWorld()
    source.items = [item('p1', 'flora'), item('p2', 'flora'), item('f1', 'fauna')]
    const snap = getGardenSnapshot(other.getState(), source)

    world.items = [item('old', 'hardscape')]
    world.moldPatches = [{ x: 0.1, y: 0.1 }]
    world.env.o2 = 41
    world.env.condensation = 0.9
    registerWorld(world)
    studio.getState().selectItem('old')
    applyGardenSnapshot(snap, studio)

    expect(studio.getState()).toMatchObject({
      vessel: 'globe',
      dayCount: 9,
      cycleProgress: 0.4,
      mineralSpots: 0.25,
      backdrop: 'karst',
      backdropHaze: 50,
      selectedId: null,
    })
    expect(world.items.map((i) => i.uid)).toEqual(['p1', 'p2', 'f1'])
    expect(world.moldPatches).toEqual([])
    expect(world.env).toMatchObject({
      humidity: 60,
      temperature: 21,
      soilMoisture: 40,
      nutrients: 50,
      cycleProgress: 0.4,
      // O2 and condensation restart from the defaults rather than keeping the previous garden's.
      o2: DEFAULT_TELEMETRY.o2Balance,
      condensation: DEFAULT_TELEMETRY.condensation,
    })
    expect(world.mineralSpots).toBe(0.25)
    expect(studio.getState()).not.toHaveProperty('version')
  })

  it('applyGardenSnapshot migrates a v2-shaped snapshot (no room) to defaults', () => {
    studio.setState({
      room: { water: 'ro', tds: 10, ph: 6.6, air: 'clean', purifier: true },
      backdrop: 'karst',
      backdropHaze: 70,
      mineralSpots: 0.8,
    })
    const v3 = getGardenSnapshot(createStudioStore(new MemoryStorage()).getState(), null)
    const v2: Partial<GardenSnapshot> = { ...v3, version: 2, vessel: 'globe' }
    for (const k of ['room', 'backdrop', 'backdropHaze', 'mineralSpots'] as const) delete v2[k]
    applyGardenSnapshot(v2 as GardenSnapshot, studio)
    expect(studio.getState()).toMatchObject({
      vessel: 'globe',
      room: DEFAULT_ROOM,
      backdrop: 'none',
      backdropHaze: 35,
      mineralSpots: 0,
    })
  })

  it('gardenSummary counts flora and fauna and floors the day', () => {
    studio.setState({ vessel: 'globe', dayCount: 4.7 })
    const items = [
      item('a', 'flora'),
      item('b', 'flora'),
      item('c', 'fauna'),
      item('d', 'hardscape'),
    ]
    expect(gardenSummary(studio.getState(), items)).toEqual({
      vessel: 'globe',
      day: 4,
      plants: 2,
      animals: 1,
    })
  })
})
