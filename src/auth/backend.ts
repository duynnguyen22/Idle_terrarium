import type { VesselId } from '@/data/vessels'
import type { GardenSnapshot } from '@/store/gardenSnapshot'

export interface GardenSummary {
  vessel: VesselId
  day: number
  plants: number
  animals: number
}

export interface GardenRecord {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  summary: GardenSummary
  snapshot: GardenSnapshot | null
}

export interface JournalEntry {
  id: string
  at: number
  day: number
  auto: boolean
  note: string
  metrics: {
    humidity: number
    temp: number
    moisture: number
    nutrients: number
    water: number
    air: number
  }
  summary: GardenSummary
  issues: string[]
}

export interface GardenProfile {
  activeGardenId?: string
}

export interface GardenBackend {
  kind: 'local' | 'cloud'
  getProfile(): Promise<GardenProfile>
  setProfile(p: GardenProfile): Promise<void>
  /** Newest updatedAt first. */
  listGardens(): Promise<GardenRecord[]>
  /** 'g_' + up to 10 base36 chars. */
  newGardenId(): string
  saveGarden(id: string, body: Omit<GardenRecord, 'id'>): Promise<void>
  renameGarden(id: string, name: string): Promise<void>
  /** Also drops the garden's journal. */
  deleteGarden(id: string): Promise<void>
  /** Newest first, at most LIST_JOURNAL entries. */
  listJournal(gid: string): Promise<JournalEntry[]>
  /** Keeps the last MAX_JOURNAL entries. */
  addJournal(gid: string, entry: Omit<JournalEntry, 'id'>): Promise<void>
  deleteAll(): Promise<void>
}

export type BackendErrorCode = 'quota_exceeded' | 'unavailable'

export class BackendError extends Error {
  readonly code: BackendErrorCode

  constructor(code: BackendErrorCode, message?: string) {
    super(message ?? (code === 'quota_exceeded' ? 'Storage is full' : 'Storage is unavailable'))
    this.name = 'BackendError'
    this.code = code
  }
}

export const MAX_JOURNAL = 120
const LIST_JOURNAL = 60

interface StoreData {
  profile: GardenProfile
  gardens: Record<string, Omit<GardenRecord, 'id'>>
  journal: Record<string, JournalEntry[]>
}

const emptyStore = (): StoreData => ({ profile: {}, gardens: {}, journal: {} })
const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

export function createLocalBackend(
  accountId: string,
  storage: Storage = globalThis.localStorage,
): GardenBackend {
  const key = `botanica_store_${accountId}`

  /** Corrupt or missing data reads as an empty store; a storage that cannot be read throws 'unavailable'. */
  const read = (): StoreData => {
    let raw: string | null
    try {
      raw = storage.getItem(key)
    } catch {
      throw new BackendError('unavailable')
    }
    if (raw === null) return emptyStore()
    try {
      const parsed: unknown = JSON.parse(raw)
      if (!isObject(parsed)) return emptyStore()
      return {
        profile: isObject(parsed.profile) ? (parsed.profile as GardenProfile) : {},
        gardens: isObject(parsed.gardens) ? (parsed.gardens as StoreData['gardens']) : {},
        journal: isObject(parsed.journal) ? (parsed.journal as StoreData['journal']) : {},
      }
    } catch {
      return emptyStore()
    }
  }

  const write = (d: StoreData): void => {
    try {
      storage.setItem(key, JSON.stringify(d))
    } catch {
      throw new BackendError('quota_exceeded')
    }
  }

  return {
    kind: 'local',
    async getProfile() {
      return read().profile
    },
    async setProfile(p) {
      const d = read()
      d.profile = p
      write(d)
    },
    async listGardens() {
      return Object.entries(read().gardens)
        .map(([id, g]) => ({ ...g, id }))
        .sort((a, b) => b.updatedAt - a.updatedAt)
    },
    newGardenId() {
      return 'g_' + Math.random().toString(36).slice(2, 12)
    },
    async saveGarden(id, body) {
      const d = read()
      d.gardens[id] = body
      write(d)
    },
    async renameGarden(id, name) {
      const d = read()
      const g = d.gardens[id]
      if (g) g.name = name
      write(d)
    },
    async deleteGarden(id) {
      const d = read()
      delete d.gardens[id]
      delete d.journal[id]
      write(d)
    },
    async listJournal(gid) {
      return (read().journal[gid] ?? [])
        .slice()
        .sort((a, b) => b.at - a.at)
        .slice(0, LIST_JOURNAL)
    },
    async addJournal(gid, entry) {
      const d = read()
      const j = d.journal[gid] ?? []
      // The random suffix keeps ids unique when two entries land in the same millisecond.
      const id = `j_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
      j.push({ ...entry, id })
      d.journal[gid] = j.slice(-MAX_JOURNAL)
      write(d)
    },
    async deleteAll() {
      try {
        storage.removeItem(key)
      } catch {
        /* nothing to remove, or storage is unavailable */
      }
    },
  }
}

// eslint-disable-next-line prefer-const -- the backend swap point: reassign to a cloud implementation
export let createBackend: (accountId: string) => GardenBackend = createLocalBackend
