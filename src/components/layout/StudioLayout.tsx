import { useAtom, useAtomValue } from 'jotai'
import { useEffect, useRef, type ReactNode } from 'react'
import { AccountDialog } from '@/components/account/AccountDialog'
import { GrowthBoard } from '@/components/growth/GrowthBoard'
import { LightingControls } from '@/components/nav/LightingControls'
import { AwayCard } from '@/components/stage/AwayCard'
import { CareToolbar } from '@/components/stage/CareToolbar'
import { ItemInspector } from '@/components/stage/ItemInspector'
import { PerfHud } from '@/components/stage/PerfHud'
import { ViewControls } from '@/components/stage/ViewControls'
import { TourCaption } from '@/components/stage/TourCaption'
import { RelaxDock } from '@/components/stage/RelaxDock'
import { Toaster } from '@/components/ui/sonner'
import { useAccountLifecycle } from '@/hooks/useAccountLifecycle'
import { useAudio } from '@/hooks/useAudio'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useLayoutMode } from '@/hooks/useLayoutMode'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useRelaxMode } from '@/hooks/useRelaxMode'
import { useTour } from '@/hooks/useTour'
import { isHandheldAtom, layoutModeAtom } from '@/store/layout'
import { drawerAtom, type DrawerSide } from '@/store/overlay'
import { LeftSidebar } from './LeftSidebar'
import { RightTelemetry } from './RightTelemetry'
import { TopNav } from './TopNav'

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

export function StudioLayout({ children }: { children: ReactNode }) {
  useKeyboardShortcuts()
  useRelaxMode()
  useTour()
  useAudio()
  useAccountLifecycle()
  useReducedMotion()
  useLayoutMode()
  const mode = useAtomValue(layoutModeAtom)
  const handheld = useAtomValue(isHandheldAtom)
  // Below the lg breakpoint the sidebars are slide-over drawers; only one is open at a time.
  const [drawer, setDrawer] = useAtom(drawerAtom)
  const toggleDrawer = (side: DrawerSide) => setDrawer((d) => (d === side ? null : side))
  // The drawer lives in the store, so reset it on unmount like the old per-mount state.
  useEffect(() => () => setDrawer(null), [setDrawer])

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
  }, [drawer, setDrawer])

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
    <div
      id="studio-root"
      data-layout={mode}
      className="flex h-screen w-screen select-none flex-col bg-cream text-ink-deep"
    >
      <TopNav drawer={drawer} onToggleDrawer={toggleDrawer} />
      <div className="relative flex flex-1 overflow-hidden">
        <LeftSidebar drawerOpen={drawer === 'left'} />
        {drawer && !handheld && (
          <button
            type="button"
            aria-label="Close panel"
            data-testid="drawer-scrim"
            onClick={() => setDrawer(null)}
            className="absolute inset-0 z-[35] bg-forest-night/40 lg:hidden"
          />
        )}
        <main id="canvas-stage" className="@container relative flex-1 overflow-hidden bg-stage">
          {children}
          <LightingControls />
          <CareToolbar />
          <ViewControls />
          <ItemInspector />
          <RelaxDock />
          <AwayCard />
          <GrowthBoard />
          <TourCaption />
          <AccountDialog />
          <PerfHud />
        </main>
        <RightTelemetry drawerOpen={drawer === 'right'} />
        <Toaster position="top-center" offset={64} />
      </div>
    </div>
  )
}
