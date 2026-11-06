import { useEffect, useState, type ReactNode } from 'react'
import { CareToolbar } from '@/components/stage/CareToolbar'
import { ItemInspector } from '@/components/stage/ItemInspector'
import { RelaxDock } from '@/components/stage/RelaxDock'
import { Toast } from '@/components/stage/Toast'
import { useAudio } from '@/hooks/useAudio'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useRelaxMode } from '@/hooks/useRelaxMode'
import { LeftSidebar } from './LeftSidebar'
import { RightTelemetry } from './RightTelemetry'
import { TopNav, type DrawerSide } from './TopNav'

export function StudioLayout({ children }: { children: ReactNode }) {
  useKeyboardShortcuts()
  useRelaxMode()
  useAudio()
  useReducedMotion()
  // Below the lg breakpoint the sidebars are slide-over drawers; only one is open at a time (local UI state).
  const [drawer, setDrawer] = useState<DrawerSide | null>(null)
  const toggleDrawer = (side: DrawerSide) => setDrawer((d) => (d === side ? null : side))

  useEffect(() => {
    if (!drawer) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawer(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
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
        <main className="relative flex-1 overflow-hidden">
          {children}
          <CareToolbar />
          <ItemInspector />
          <RelaxDock />
          <Toast />
        </main>
        <RightTelemetry drawerOpen={drawer === 'right'} />
      </div>
    </div>
  )
}
