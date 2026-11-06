import type { ReactNode } from 'react'
import { CareToolbar } from '@/components/stage/CareToolbar'
import { ItemInspector } from '@/components/stage/ItemInspector'
import { RelaxDock } from '@/components/stage/RelaxDock'
import { Toast } from '@/components/stage/Toast'
import { useAudio } from '@/hooks/useAudio'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useRelaxMode } from '@/hooks/useRelaxMode'
import { LeftSidebar } from './LeftSidebar'
import { RightTelemetry } from './RightTelemetry'
import { TopNav } from './TopNav'

export function StudioLayout({ children }: { children: ReactNode }) {
  useKeyboardShortcuts()
  useRelaxMode()
  useAudio()
  return (
    <div className="flex h-screen w-screen select-none flex-col bg-cream text-ink-deep">
      <TopNav />
      <div className="relative flex flex-1 overflow-hidden">
        <LeftSidebar />
        <main className="relative flex-1 overflow-hidden">
          {children}
          <CareToolbar />
          <ItemInspector />
          <RelaxDock />
          <Toast />
        </main>
        <RightTelemetry />
      </div>
    </div>
  )
}
