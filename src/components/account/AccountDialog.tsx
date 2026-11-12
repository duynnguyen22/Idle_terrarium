import { Dialog } from 'radix-ui'
import { useEffect, useRef } from 'react'
import { useAccount } from '@/components/account/auth/authEnv'
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

const focusAutofocus = (panel: HTMLElement | null) => {
  const target = panel?.querySelector<HTMLElement>('[data-autofocus]') ?? panel
  target?.focus()
}

/**
 * Modal shell for every account screen, on Radix Dialog: scrim, panel, close button, Escape and
 * focus trapping. Onboarding cannot be dismissed: `closePanel` does nothing in that phase.
 */
export function AccountDialog() {
  const panelOpen = useAccount((s) => s.panelOpen)
  const onboarding = useAccount((s) => s.phase === 'onboarding')
  const closePanel = useAccount((s) => s.closePanel)
  const view = useResolvedView()
  const panelRef = useRef<HTMLDivElement>(null)
  const shownView = useRef<AuthView | null>(null)

  // A different screen replacing the body takes focus to its [data-autofocus] element (its old
  // elements are gone); re-renders within the same view leave focus where the person put it.
  useEffect(() => {
    if (!panelOpen) {
      shownView.current = null
      return
    }
    if (shownView.current !== null && shownView.current !== view) focusAutofocus(panelRef.current)
    shownView.current = view
  }, [panelOpen, view])

  return (
    <Dialog.Root
      open={panelOpen}
      onOpenChange={(open) => {
        if (!open) closePanel()
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay id="acct-scrim" className="acct-scrim" onClick={closePanel} />
        <Dialog.Content
          id="acct-panel"
          ref={panelRef}
          className={`acct-panel${view === 'account' ? ' wide' : ''}`}
          aria-modal="true"
          aria-labelledby="acct-title"
          aria-describedby={undefined}
          // Escape closes the dialog only, not relax mode or the selection (global handler on window).
          onEscapeKeyDown={(e) => e.stopPropagation()}
          onOpenAutoFocus={(e) => {
            e.preventDefault()
            focusAutofocus(panelRef.current)
          }}
          onCloseAutoFocus={(e) => {
            e.preventDefault()
            document.getElementById('btn-account')?.focus()
          }}
        >
          {!onboarding && (
            <Dialog.Close id="acct-close" className="acct-x" aria-label="Close">
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
            </Dialog.Close>
          )}
          <div id="acct-body" className="acct-body">
            <AuthScreen view={view} />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
