import type { AccountActions } from './contract'
import type { AccountContext } from './context'

type PanelViewActions = Pick<
  AccountActions,
  | 'openPanel'
  | 'closePanel'
  | 'openAuth'
  | 'goView'
  | 'setViewData'
  | 'setUser'
  | 'setTab'
  | 'setRenaming'
  | 'setConfirmDelete'
>

/** The account panel: open or closed, which auth screen and tab it shows, and its form values. */
export function panelViewActions(ctx: AccountContext): PanelViewActions {
  const { state, setAccount, actions } = ctx
  return {
    openPanel() {
      const { phase, view } = state()
      let next = view
      if (phase === 'checking') next = 'checking'
      else if (phase === 'signedout' && (view === 'account' || view === 'checking')) next = 'signin'
      setAccount({ panelOpen: true, view: next })
    },

    closePanel() {
      // Onboarding must finish before the panel can close.
      if (state().phase === 'onboarding') return
      // An open rename or delete confirmation does not survive the panel closing.
      setAccount({ panelOpen: false, renaming: null, confirmDelete: null })
    },

    openAuth(view, data = {}) {
      setAccount({ view, viewData: { ...data } })
      actions.openPanel()
    },

    goView(view, data = {}) {
      setAccount((s) => ({
        view,
        viewData: { ...s.viewData, ...data, error: null, fieldErrors: {} },
      }))
    },

    setViewData(patch) {
      setAccount((s) => ({ viewData: { ...s.viewData, ...patch } }))
    },

    setUser(user) {
      if (state().user?.id !== user.id) return false
      setAccount({ user })
      return true
    },
    setTab: (tab) => setAccount({ tab }),
    setRenaming: (renaming) => setAccount({ renaming }),
    setConfirmDelete: (confirmDelete) => setAccount({ confirmDelete }),
  }
}
