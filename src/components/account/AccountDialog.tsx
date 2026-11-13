import { Dialog as DialogPrimitive } from 'radix-ui'
import { XIcon } from 'lucide-react'
import { cn } from 'cn'
import { useEffect, useRef } from 'react'
import { atom, useAtomValue } from 'jotai'
import { useAccountActions } from '@/components/account/auth/authEnv'
import { AuthScreen } from '@/components/account/auth/AuthScreen'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogOverlay, DialogPortal } from '@/components/ui/dialog'
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
    <Dialog
      open={panelOpen}
      onOpenChange={(open) => {
        if (!open) closePanel()
      }}
    >
      <DialogPortal>
        <DialogOverlay
          id="acct-scrim"
          className="bg-[rgb(17_34_26/0.45)] supports-backdrop-filter:backdrop-blur-none"
          onClick={closePanel}
        />
        <DialogPrimitive.Content
          id="acct-panel"
          ref={panelRef}
          className={cn(
            'fixed top-1/2 left-1/2 z-50 flex max-h-[min(86vh,780px)] w-[min(440px,calc(100%-32px))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[18px] bg-paper text-foreground shadow-[0_24px_64px_rgb(17_34_26/0.32)] outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-[0.98] data-open:slide-in-from-bottom-2.5 motion-reduce:animate-none',
            view === 'account' && 'wide w-[min(560px,calc(100%-32px))]',
          )}
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
            <DialogClose asChild>
              <Button
                id="acct-close"
                variant="ghost"
                size="icon"
                className="absolute top-3 right-3 z-10 text-ink-soft"
                aria-label="Close"
              >
                <XIcon />
              </Button>
            </DialogClose>
          )}
          <div
            id="acct-body"
            className="grid flex-1 content-start gap-3.5 overflow-y-auto px-7 pt-7 pb-[calc(24px+env(safe-area-inset-bottom,0px))]"
          >
            <AuthScreen view={view} />
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}
