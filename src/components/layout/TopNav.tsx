import { ClockSpeedPill } from '@/components/nav/ClockSpeedPill'
import { LightingControls } from '@/components/nav/LightingControls'
import { UtilityActions } from '@/components/nav/UtilityActions'

export function TopNav() {
  return (
    <header
      id="top-nav"
      className="z-30 flex h-14 shrink-0 items-center justify-between gap-2 overflow-x-auto border-b border-sand-border bg-paper/95 px-3 backdrop-blur-md"
    >
      <div className="flex shrink-0 items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-forest-deep text-white shadow-sm">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L4 7v10l8 5 8-5V7l-8-5z" strokeLinejoin="round" />
            <path
              d="M12 22V12M12 12C12 9 15 7 17 8C17 11 15 12 12 12ZM12 12C12 9 9 7 7 8C7 11 9 12 12 12Z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="leading-tight">
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <h1 className="font-serif-title text-base font-bold tracking-tight text-forest-ink">Botanica</h1>
            <span className="rounded-full bg-mint-light px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-forest-deep">
              Living Biosphere
            </span>
          </div>
          <p className="whitespace-nowrap text-[11px] text-stone-grey">
            Real-Time Semi-Aquatic &amp; Terrarium Studio
          </p>
        </div>
      </div>
      <ClockSpeedPill />
      <LightingControls />
      <UtilityActions />
    </header>
  )
}
