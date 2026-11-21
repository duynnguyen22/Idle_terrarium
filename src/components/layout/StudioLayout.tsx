import { useAtom, useAtomValue } from 'jotai'
import { cn } from 'cn'
import { useEffect, type ReactNode } from 'react'
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
import { relaxModeAtom } from '@/store/studio'
import { LeftSidebar } from './LeftSidebar'
import { PhoneSheetVars } from './phone/PhoneSheetVars'
import { PhoneTabBar } from './phone/PhoneTabBar'
import { RightTelemetry } from './RightTelemetry'
import { TopNav } from './TopNav'
import { useDrawerA11y } from './useDrawerA11y'

/** Room the stage leaves for the tab bar (and the open sheet) on a phone, or for the rail in landscape. */
const STAGE_MARGIN = {
  desktop: '',
  phone: 'mb-[calc(58px+env(safe-area-inset-bottom)+var(--stage-pad))]',
  land: 'ml-[60px]',
} as const

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
  const relax = useAtomValue(relaxModeAtom)
  // Below the lg breakpoint the sidebars are slide-over drawers; only one is open at a time.
  const [drawer, setDrawer] = useAtom(drawerAtom)
  const toggleDrawer = (side: DrawerSide) => setDrawer((d) => (d === side ? null : side))
  // The drawer lives in the store, so reset it on unmount like the old per-mount state.
  useEffect(() => () => setDrawer(null), [setDrawer])

  useDrawerA11y(drawer, setDrawer)

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
        <main
          id="canvas-stage"
          className={cn(
            '@container relative flex-1 overflow-hidden bg-stage',
            !relax && STAGE_MARGIN[mode],
          )}
        >
          {children}
          <LightingControls />
          <CareToolbar />
          <ViewControls />
          <ItemInspector />
          <RelaxDock />
          <AwayCard />
          {!handheld && <GrowthBoard />}
          <TourCaption />
          <AccountDialog />
          <PerfHud />
        </main>
        <RightTelemetry drawerOpen={drawer === 'right'} />
        {/* Handheld: a fixed sheet, so it sits outside the stage's @container (which would contain it). */}
        {handheld && <GrowthBoard />}
        <Toaster position="top-center" offset={64} />
      </div>
      <PhoneTabBar />
      <PhoneSheetVars />
    </div>
  )
}
