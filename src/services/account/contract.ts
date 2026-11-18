import type { AuthService, PublicUser, Session } from '@/auth'
import type { GardenBackend, GardenRecord, JournalEntry } from '@/auth/backend'
import type { EngineWorld } from '@/engine/world'
import type { AccountTab, AuthView, GardenStart, ViewData } from './state'

export interface AccountActions {
  initAccount(): Promise<void>
  beginSession(user: PublicUser, session: Session, o: { isNew: boolean }): Promise<void>
  endSession(message?: string): Promise<void>
  watchSession(): void
  scheduleCloudSave(): void
  flushCloudSave(): Promise<void>
  createGarden(kind: GardenStart, name: string): Promise<GardenRecord>
  openGarden(id: string): Promise<void>
  renameGarden(id: string, name: string): Promise<void>
  deleteGarden(id: string): Promise<void>
  /** Resolves true once the entry is stored; false when nothing is open or the write failed. */
  addJournalEntry(
    note: string,
    auto: boolean,
    extra?: { events?: JournalEntry['events']; key?: string },
  ): Promise<boolean>
  refreshGardens(): Promise<void>
  refreshJournal(): Promise<void>
  openPanel(): void
  closePanel(): void
  openAuth(view: AuthView, data?: ViewData): void
  goView(view: AuthView, data?: ViewData): void
  setViewData(patch: ViewData): void
  /**
   * Replaces the signed-in user's public profile (after a profile edit). Ignored, returning false,
   * when nobody is signed in or a different user is, so a late reply cannot revive an ended session.
   */
  setUser(user: PublicUser): boolean
  /**
   * Closes the open terrarium without a final save: cancels the pending and retry saves, waits for a
   * write already under way, and returns the id that was open. Used before wiping the storage.
   */
  detachActiveGarden(): Promise<string | null>
  /** Reopens a terrarium closed by detachActiveGarden, while the session is still signed in. */
  attachActiveGarden(id: string | null): void
  setTab(tab: AccountTab): void
  setRenaming(id: string | null): void
  setConfirmDelete(id: string | null): void
  run(fn: () => Promise<void>): Promise<void>
  /**
   * Books a backend failure on the chip. The storage-full toast fires once when a background save
   * enters that state; with `user` (a failed action the person just asked for) it fires every time.
   */
  handleCloudError(e: unknown, o?: { user?: boolean }): void
}

/** The account actions, bound to one jotai store (see createAccount). */
export type Account = AccountActions

export interface AccountDeps {
  auth: AuthService
  createBackend: (id: string) => GardenBackend
  getWorld: () => EngineWorld | null
  toast: (m: string) => void
  now?: () => number
  /** Where the "sign-up prompt already shown" flag lives; defaults to localStorage. */
  welcomeStorage?: Storage
  /** Hears the first pointer or key input that schedules the sign-up prompt; defaults to window. */
  welcomeTarget?: Pick<Window, 'addEventListener' | 'removeEventListener'>
}
