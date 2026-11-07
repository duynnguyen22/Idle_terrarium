import { ClockSpeedPill } from '@/components/nav/ClockSpeedPill'
import { UtilityActions } from '@/components/nav/UtilityActions'

export type DrawerSide = 'left' | 'right'

const DRAWER_BTN =
  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-sand-border bg-sand-pale text-ink-soft transition hover:bg-sand-track lg:hidden'

interface TopNavProps {
  /** Which slide-over drawer is open below the lg breakpoint. */
  drawer?: DrawerSide | null
  onToggleDrawer?: (side: DrawerSide) => void
}

export function TopNav({ drawer = null, onToggleDrawer }: TopNavProps) {
  return (
    <header
      id="top-nav"
      className="z-30 flex h-14 shrink-0 flex-nowrap items-center justify-between gap-2 border-b border-sand-border bg-paper/95 px-3 backdrop-blur-md"
    >
      <div className="flex shrink-0 items-center gap-2.5">
        <button
          type="button"
          aria-label="Toggle catalog panel"
          aria-expanded={drawer === 'left'}
          aria-controls="left-sidebar"
          onClick={() => onToggleDrawer?.('left')}
          className={DRAWER_BTN}
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
        </button>
        <button
          type="button"
          aria-label="Toggle telemetry panel"
          aria-expanded={drawer === 'right'}
          aria-controls="right-sidebar"
          onClick={() => onToggleDrawer?.('right')}
          className={DRAWER_BTN}
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" strokeLinecap="round" />
          </svg>
        </button>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-forest-deep text-white shadow-sm">
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 2L4 7v10l8 5 8-5V7l-8-5z" strokeLinejoin="round" />
            <path
              d="M12 22V12M12 12C12 9 15 7 17 8C17 11 15 12 12 12ZM12 12C12 9 9 7 7 8C7 11 9 12 12 12Z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="leading-tight">
          <h1 className="whitespace-nowrap font-serif-title text-lg font-bold tracking-tight text-forest-ink">
            Botanica
          </h1>
          <p className="hidden whitespace-nowrap text-[11px] text-stone-grey xl:block">
            Paludarium &amp; terrarium studio
          </p>
        </div>
      </div>
      <ClockSpeedPill />
      <UtilityActions />
    </header>
  )
}
