import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AccountDialog } from '@/components/account/AccountDialog'
import { LightingControls } from '@/components/nav/LightingControls'
import { CareToolbar } from '@/components/stage/CareToolbar'
import { ItemInspector } from '@/components/stage/ItemInspector'
import { RelaxDock } from '@/components/stage/RelaxDock'
import { Toast } from '@/components/stage/Toast'
import { useAccountLifecycle } from '@/hooks/useAccountLifecycle'
import { useAudio } from '@/hooks/useAudio'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useRelaxMode } from '@/hooks/useRelaxMode'
import { LeftSidebar } from './LeftSidebar'
import { RightTelemetry } from './RightTelemetry'
import { TopNav, type DrawerSide } from './TopNav'

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

export function StudioLayout({ children }: { children: ReactNode }) {
  useKeyboardShortcuts()
  useRelaxMode()
  useAudio()
  useAccountLifecycle()
  useReducedMotion()
  // Below the lg breakpoint the sidebars are slide-over drawers; only one is open at a time (local UI state).
  const [drawer, setDrawer] = useState<DrawerSide | null>(null)
  const toggleDrawer = (side: DrawerSide) => setDrawer((d) => (d === side ? null : side))

  useEffect(() => {
    if (!drawer) return
    // Capture phase + stopPropagation: Escape closes the drawer only, so the global shortcut handler
    // (relax exit / clear selection) does not also fire on the same keypress.
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      setDrawer(null)
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [drawer])

  // Focus management: into the drawer on open, back to its toggle on close.
  const prevDrawer = useRef<DrawerSide | null>(null)
  useEffect(() => {
    const prev = prevDrawer.current
    prevDrawer.current = drawer
    if (drawer) {
      const panel = document.getElementById(`${drawer}-sidebar`)
      const first = panel?.querySelector<HTMLElement>(FOCUSABLE)
      ;(first ?? panel)?.focus()
    } else if (prev) {
      document.querySelector<HTMLElement>(`[aria-controls="${prev}-sidebar"]`)?.focus()
    }
  }, [drawer])

  return (
    <div className="flex h-screen w-screen select-none flex-col bg-cream text-ink-deep">
      <TopNav drawer={drawer} onToggleDrawer={toggleDrawer} />
      <div className="relative flex flex-1 overflow-hidden">
        <LeftSidebar drawerOpen={drawer === 'left'} />
        {drawer && (
          <button
            type="button"
            aria-label="Close panel"
            data-testid="drawer-scrim"
            onClick={() => setDrawer(null)}
            className="absolute inset-0 z-[35] bg-forest-night/40 lg:hidden"
          />
        )}
        <main id="canvas-stage" className="relative flex-1 overflow-hidden bg-stage">
          {children}
          <LightingControls />
          <CareToolbar />
          <ItemInspector />
          <RelaxDock />
          <Toast />
          <AccountDialog />
        </main>
        <RightTelemetry drawerOpen={drawer === 'right'} />
      </div>
    </div>
  )
}
