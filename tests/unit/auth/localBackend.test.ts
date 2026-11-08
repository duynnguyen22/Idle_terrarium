import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MAX_JOURNAL, createLocalBackend } from '@/auth/backend'
import type { GardenBackend, GardenRecord, GardenSummary, JournalEntry } from '@/auth/backend'

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

const summary: GardenSummary = { vessel: 'globe', day: 3, plants: 2, animals: 1 }
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

  it('a getItem failure rejects with BackendError unavailable', async () => {
    class UnreadableStorage extends MemoryStorage {
      getItem(): string | null {
        throw new DOMException('denied', 'SecurityError')
      }
    }
    const b = createLocalBackend('acct1', new UnreadableStorage())
    await expect(b.listGardens()).rejects.toMatchObject({
      name: 'BackendError',
      code: 'unavailable',
    })
  })

  it.each([['[]'], ['"x"'], ['null'], ['42']])('a stored blob %s reads as empty', async (blob) => {
    storage.setItem('botanica_store_acct1', blob)
    expect(await backend.getProfile()).toEqual({})
    expect(await backend.listGardens()).toEqual([])
    expect(await backend.listJournal('a')).toEqual([])
  })

  it('a failed write leaves the stored data intact', async () => {
    await backend.saveGarden('a', garden('keep', 1))
    const before = storage.getItem('botanica_store_acct1')
    const setItem = vi.spyOn(storage, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    await expect(backend.saveGarden('b', garden('lost', 2))).rejects.toMatchObject({
      code: 'quota_exceeded',
    })
    setItem.mockRestore()
    expect(storage.getItem('botanica_store_acct1')).toBe(before)
    expect((await backend.listGardens()).map((g) => g.id)).toEqual(['a'])
  })

  it('skips malformed entries instead of throwing', async () => {
    storage.setItem(
      'botanica_store_acct1',
      JSON.stringify({
        profile: {},
        gardens: { bad: null, str: 'x', ok: garden('ok', 5) },
        journal: { a: 'nope', b: [null, entry(1)] },
      }),
    )
    expect((await backend.listGardens()).map((g) => g.id)).toEqual(['ok'])
    expect(await backend.listJournal('a')).toEqual([])
    expect(await backend.listJournal('b')).toHaveLength(1)
    await expect(backend.addJournal('a', entry(2))).resolves.toBeUndefined()
  })

  it('renaming an unknown garden does not write', async () => {
    const setItem = vi.spyOn(storage, 'setItem')
    await backend.renameGarden('missing', 'x')
    expect(setItem).not.toHaveBeenCalled()
  })
})
