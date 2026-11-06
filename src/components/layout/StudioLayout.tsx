import type { ReactNode } from 'react'
import { Toast } from '@/components/stage/Toast'
import { LeftSidebar } from './LeftSidebar'
import { RightTelemetry } from './RightTelemetry'
import { TopNav } from './TopNav'

export function StudioLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen w-screen select-none flex-col bg-cream text-ink-deep">
      <TopNav />
      <div className="relative flex flex-1 overflow-hidden">
        <LeftSidebar />
        <main className="relative flex-1 overflow-hidden">
          {children}
          <Toast />
        </main>
        <RightTelemetry />
      </div>
    </div>
  )
}
