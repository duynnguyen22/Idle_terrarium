import { atom, type Atom, type PrimitiveAtom } from 'jotai'
import { initialAccountState, type AccountState } from './state'

// ---------------------------------------------------------------------------------------------
// One atom per field. Components read these; only the account actions write them.
// ---------------------------------------------------------------------------------------------

type AccountAtoms = { [K in keyof AccountState]: PrimitiveAtom<AccountState[K]> }

const INITIAL = initialAccountState()
const ACCOUNT_KEYS = Object.keys(INITIAL) as (keyof AccountState)[]

const accountAtoms = Object.fromEntries(
  Object.entries(INITIAL).map(([k, v]) => [k, atom(v)]),
) as unknown as AccountAtoms

export const phaseAtom = accountAtoms.phase
export const userAtom = accountAtoms.user
export const sessionAtom = accountAtoms.session
export const backendAtom = accountAtoms.backend
export const gardensAtom = accountAtoms.gardens
export const activeIdAtom = accountAtoms.activeId
export const journalAtom = accountAtoms.journal
export const saveTimerAtom = accountAtoms.saveTimer
export const writingAtom = accountAtoms.writing
export const pendingAtom = accountAtoms.pending
export const lastSavedAtom = accountAtoms.lastSaved
export const lastErrorAtom = accountAtoms.lastError
export const panelOpenAtom = accountAtoms.panelOpen
export const viewAtom = accountAtoms.view
export const viewDataAtom = accountAtoms.viewData
export const tabAtom = accountAtoms.tab
export const confirmDeleteAtom = accountAtoms.confirmDelete
export const renamingAtom = accountAtoms.renaming
export const busyAtom = accountAtoms.busy

/** The whole account state as one object (imperative reads, chipStatus, tests). */
export const accountStateAtom = atom((get) => {
  const out = {} as Record<string, unknown>
  for (const k of ACCOUNT_KEYS) out[k] = get(accountAtoms[k] as Atom<unknown>)
  return out as unknown as AccountState
})

/** Writes several account fields at once; takes a patch or a function of the current state. */
export const patchAccountAtom = atom(
  null,
  (get, set, p: Partial<AccountState> | ((s: AccountState) => Partial<AccountState>)) => {
    const next = typeof p === 'function' ? p(get(accountStateAtom)) : p
    for (const k of Object.keys(next) as (keyof AccountState)[])
      if (Object.hasOwn(accountAtoms, k)) set(accountAtoms[k] as PrimitiveAtom<unknown>, next[k])
  },
)

/** Puts every account field back to its initial value (sign-in screen, nothing loaded). */
export const resetAccountAtom = atom(null, (_get, set) =>
  set(patchAccountAtom, initialAccountState()),
)
