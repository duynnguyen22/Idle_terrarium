import { Dialog } from 'radix-ui'
import { useEffect, useRef } from 'react'
import { atom, useAtomValue } from 'jotai'
import { useAccountActions } from '@/components/account/auth/authEnv'
import { AuthScreen } from '@/components/account/auth/AuthScreen'
import { panelOpenAtom, phaseAtom, viewAtom, type AuthView } from '@/store/account'

/** Which screen shows for the current phase and requested view (spec renderAuth, 5121-5122). */
const resolvedViewAtom = atom((get): AuthView => {
  const phase = get(phaseAtom)
  const view = get(viewAtom)
  if (phase === 'checking') return 'checking'
  if (phase === 'onboarding') return 'onboarding'
  if (phase === 'cloud') return 'account'
  return view === 'account' || view === 'onboarding' ? 'signin' : view
})

const focusAutofocus = (panel: HTMLElement | null) => {
  const target = panel?.querySelector<HTMLElement>('[data-autofocus]') ?? panel
  target?.focus()
}

/**
 * Modal shell for every account screen, on Radix Dialog: scrim, panel, close button, Escape and
 * focus trapping. Onboarding cannot be dismissed: `closePanel` does nothing in that phase.
 */
export function AccountDialog() {
  const panelOpen = useAtomValue(panelOpenAtom)
  const onboarding = useAtomValue(phaseAtom) === 'onboarding'
  const closePanel = useAccountActions().closePanel
  const view = useAtomValue(resolvedViewAtom)
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
