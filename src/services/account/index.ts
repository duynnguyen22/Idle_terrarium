import { authService } from '@/auth'
import { createBackend } from '@/auth/backend'
import { tryGetWorld } from '@/engine/engineBridge'
import { appStore } from '@/store/appStore'
import { showToast } from '@/store/toast'
import type { Account } from './contract'
import { createAccount } from './createAccount'

export {
  accountStateAtom,
  activeIdAtom,
  backendAtom,
  busyAtom,
  confirmDeleteAtom,
  gardensAtom,
  journalAtom,
  lastErrorAtom,
  lastSavedAtom,
  panelOpenAtom,
  patchAccountAtom,
  pendingAtom,
  phaseAtom,
  renamingAtom,
  resetAccountAtom,
  saveTimerAtom,
  sessionAtom,
  tabAtom,
  userAtom,
  viewAtom,
  viewDataAtom,
  writingAtom,
} from './atoms'
export { SAVE_DEBOUNCE_MS, WELCOME_KEY } from './constants'
export type { Account, AccountActions, AccountDeps } from './contract'
export { createAccount } from './createAccount'
export { avatarColor, chipStatus, initialsOf, timeAgo } from './display'
export { CLEARED_ACCOUNT_FORM, initialAccountState } from './state'
export type {
  AccountPhase,
  AccountState,
  AccountTab,
  AuthView,
  GardenStart,
  ViewData,
} from './state'

/** The app's account, bound to the app store. */
export const account: Account = createAccount(appStore, {
  auth: authService,
  // Late-bound so a reassigned `createBackend` (the cloud swap point) is picked up.
  createBackend: (id) => createBackend(id),
  getWorld: tryGetWorld,
  toast: showToast,
})
