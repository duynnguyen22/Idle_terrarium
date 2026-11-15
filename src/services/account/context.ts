import type { Store } from 'jotai'
import { accountStateAtom, patchAccountAtom } from './atoms'
import type { AccountActions, AccountDeps } from './contract'
import type { AccountState } from './state'

/**
 * What every account use case shares, one object per createAccount call. The timer and the
 * in-flight write are mutable fields: read and write them on this object, never through a copy.
 */
export interface AccountContext {
  store: Store
  deps: AccountDeps
  now: () => number
  state: () => AccountState
  setAccount: (p: Partial<AccountState> | ((s: AccountState) => Partial<AccountState>)) => void
  /** The one actions object createAccount returns; internal calls go through it. */
  actions: AccountActions
  /** The pending retry after an `unavailable` write; at most one, cancelled on sign-out. */
  retryTimer: ReturnType<typeof setTimeout> | null
  /** The garden write under way, if any (it never rejects). */
  inFlight: Promise<void> | null
}

export function createAccountContext(
  store: Store,
  deps: AccountDeps,
  actions: AccountActions,
): AccountContext {
  const now = deps.now ?? (() => Date.now())
  const state = () => store.get(accountStateAtom)
  const setAccount = (p: Partial<AccountState> | ((s: AccountState) => Partial<AccountState>)) =>
    store.set(patchAccountAtom, p)
  return { store, deps, now, state, setAccount, actions, retryTimer: null, inFlight: null }
}
