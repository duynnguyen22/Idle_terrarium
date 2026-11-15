import type { Store } from 'jotai'
import { actionErrorActions } from './actionErrors'
import { cloudSaveActions } from './cloudSave'
import { createAccountContext } from './context'
import type { Account, AccountActions, AccountDeps } from './contract'
import { gardenListActions } from './gardenList'
import { journalActions } from './journal'
import { panelViewActions } from './panelView'
import { sessionActions } from './session'

/**
 * The account layer (spec 4293-4625): who is signed in, their terrariums and growth journal, and the
 * debounced save of the open terrarium. Not persisted: the session lives in the auth service and the
 * gardens in the backend. Dependencies are injected so tests run against fakes;
 * the state lives in the account atoms, in `store`, which also holds the studio atoms it saves.
 */
export function createAccount(store: Store, deps: AccountDeps): Account {
  // One object, filled below, so every internal call goes through what this returns.
  // Factories must not call an action while they are being built, and their method names must not
  // overlap: Object.assign fills this object only after every factory has run.
  const actions = {} as AccountActions
  const ctx = createAccountContext(store, deps, actions)
  const all: AccountActions = {
    ...sessionActions(ctx),
    ...cloudSaveActions(ctx),
    ...gardenListActions(ctx),
    ...journalActions(ctx),
    ...panelViewActions(ctx),
    ...actionErrorActions(ctx),
  }
  Object.assign(actions, all)
  return actions
}
