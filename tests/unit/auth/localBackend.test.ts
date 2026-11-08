import { beforeEach, describe, expect, it } from 'vitest'
import { MAX_JOURNAL, createLocalBackend } from '@/auth/backend'
import type { GardenBackend, GardenRecord, JournalEntry } from '@/auth/backend'

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

class FullStorage extends MemoryStorage {
  setItem(): void {
    throw new DOMException('full', 'QuotaExceededError')
  }
}

const summary = { vessel: 'jar', day: 3, plants: 2, animals: 1 } as GardenRecord['summary']
const garden = (name: string, updatedAt: number): Omit<GardenRecord, 'id'> => ({
  name,
  createdAt: 1,
  updatedAt,
  summary,
  snapshot: null,
})
const entry = (at: number): Omit<JournalEntry, 'id'> => ({
  at,
  day: 1,
  auto: true,
  note: '',
  metrics: { humidity: 1, temp: 2, moisture: 3, nutrients: 4, water: 5, air: 6 },
  summary,
  issues: [],
})

let storage: MemoryStorage
let backend: GardenBackend

beforeEach(() => {
  storage = new MemoryStorage()
  backend = createLocalBackend('acct1', storage)
})

describe('local garden backend', () => {
  it('reads an empty store and lists gardens newest first', async () => {
    expect(backend.kind).toBe('local')
    expect(await backend.getProfile()).toEqual({})
    expect(await backend.listGardens()).toEqual([])
    expect(await backend.listJournal('nope')).toEqual([])
    await backend.saveGarden('a', garden('old', 10))
    await backend.saveGarden('b', garden('new', 20))
    const list = await backend.listGardens()
    expect(list.map((g) => g.id)).toEqual(['b', 'a'])
    expect(backend.newGardenId()).toMatch(/^g_[a-z0-9]{1,10}$/)
    await backend.renameGarden('a', 'renamed')
    expect((await backend.listGardens()).find((g) => g.id === 'a')?.name).toBe('renamed')
    await backend.setProfile({ activeGardenId: 'b' })
    expect(await backend.getProfile()).toEqual({ activeGardenId: 'b' })
  })

  it('deleteGarden drops its journal too', async () => {
    await backend.saveGarden('a', garden('a', 1))
    await backend.addJournal('a', entry(1))
    await backend.deleteGarden('a')
    expect(await backend.listGardens()).toEqual([])
    expect(await backend.listJournal('a')).toEqual([])
  })

  it('addJournal keeps only the last 120 entries and listJournal returns 60 newest first', async () => {
    for (let i = 0; i < MAX_JOURNAL + 10; i++) await backend.addJournal('a', entry(i))
    const stored = JSON.parse(storage.getItem('botanica_store_acct1')!)
    expect(stored.journal.a).toHaveLength(MAX_JOURNAL)
    const list = await backend.listJournal('a')
    expect(list).toHaveLength(60)
    expect(list[0]!.at).toBe(MAX_JOURNAL + 9)
    expect(list[59]!.at).toBe(MAX_JOURNAL + 9 - 59)
    expect(new Set(stored.journal.a.map((j: JournalEntry) => j.id)).size).toBe(MAX_JOURNAL)
  })

  it('a full storage throws BackendError quota_exceeded', async () => {
    const full = createLocalBackend('acct1', new FullStorage())
    await expect(full.saveGarden('a', garden('a', 1))).rejects.toMatchObject({
      code: 'quota_exceeded',
    })
  })

  it('corrupt JSON reads as an empty store', async () => {
    storage.setItem('botanica_store_acct1', '{not json')
    expect(await backend.listGardens()).toEqual([])
    expect(await backend.getProfile()).toEqual({})
    await backend.saveGarden('a', garden('a', 1))
    expect(await backend.listGardens()).toHaveLength(1)
  })

  it('uses the key botanica_store_<accountId>', async () => {
    await backend.saveGarden('a', garden('a', 1))
    expect(storage.getItem('botanica_store_acct1')).not.toBeNull()
    expect(storage.length).toBe(1)
    await backend.deleteAll()
    expect(storage.getItem('botanica_store_acct1')).toBeNull()
  })
})
