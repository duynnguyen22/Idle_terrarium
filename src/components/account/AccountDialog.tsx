import { useEffect, useRef } from 'react'
import { useAccount, useAuthEnv } from '@/components/account/auth/authEnv'
import { AuthScreen } from '@/components/account/auth/AuthScreen'
import type { AuthView } from '@/store/useAccountStore'

/** Which screen shows for the current phase and requested view (spec renderAuth, 5121-5122). */
function useResolvedView(): AuthView {
  return useAccount((s): AuthView => {
    if (s.phase === 'checking') return 'checking'
    if (s.phase === 'onboarding') return 'onboarding'
    if (s.phase === 'cloud') return 'account'
    return s.view === 'account' || s.view === 'onboarding' ? 'signin' : s.view
  })
}

/** Modal shell for every account screen: scrim, panel, close button, Escape and focus handling. */
export function AccountDialog() {
  const { store } = useAuthEnv()
  const panelOpen = useAccount((s) => s.panelOpen)
  const onboarding = useAccount((s) => s.phase === 'onboarding')
  const closePanel = useAccount((s) => s.closePanel)
  const view = useResolvedView()
  const panelRef = useRef<HTMLDivElement>(null)
  const wasOpen = useRef(false)

  useEffect(() => {
    if (!panelOpen) return
    // Capture phase + stopPropagation: Escape closes the dialog only, not relax mode or the selection.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      store.getState().closePanel()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [panelOpen, store])

  // Focus moves only on open and when a different screen replaces the body (its old elements are gone);
  // re-renders within the same view leave focus where the person put it. Back to the chip on close.
  useEffect(() => {
    if (panelOpen) {
      const panel = panelRef.current
      const target = panel?.querySelector<HTMLElement>('[data-autofocus]') ?? panel
      target?.focus()
    } else if (wasOpen.current) {
      document.getElementById('btn-account')?.focus()
    }
    wasOpen.current = panelOpen
    // `view` is a string: the effect re-runs on a screen change, not on same-view store updates.
  }, [panelOpen, view])

  if (!panelOpen) return null

  return (
    <>
      <div id="acct-scrim" className="acct-scrim" onClick={closePanel} />
      <div
        id="acct-panel"
        ref={panelRef}
        className={`acct-panel${view === 'account' ? ' wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="acct-title"
        tabIndex={-1}
      >
        {!onboarding && (
          <button
            id="acct-close"
            type="button"
            className="acct-x"
            aria-label="Close"
            onClick={closePanel}
          >
            <svg
              className="h-4 w-4 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        )}
        <div id="acct-body" className="acct-body">
          <AuthScreen view={view} />
        </div>
      </div>
    </>
  )
}
