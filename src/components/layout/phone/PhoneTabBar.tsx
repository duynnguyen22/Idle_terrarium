import { useAtomValue, useSetAtom } from 'jotai'
import { cn } from 'cn'
import { enterRelax } from '@/components/nav/studioActions'
import { activeSheetAtom, layoutModeAtom, openSheetAtom, type SheetName } from '@/store/layout'
import { relaxModeAtom } from '@/store/studio'

/** Tab icon paths from the prototype's #m-tabs (24 px viewBox, stroked). */
const ICONS = {
  build:
    'M12 20V10M12 10c0-3.5 2.5-6 6.5-6c0 4-2.5 6-6.5 6zM12 13c0-2.6-2-4.5-5.5-4.5c0 3 2 4.5 5.5 4.5zM5 20h14',
  health: 'M3 12h4l2-6l4 12l2-6h6',
  growth: 'M4 20h16M7 20v-5M12 20V9M17 20v-8',
  relax: 'M5 19c0-8 5-14 15-15c0 10-6 15-14 15zM5 19l7-7',
} as const

const SHEET_TABS: { name: SheetName; label: string }[] = [
  { name: 'build', label: 'Build' },
  { name: 'health', label: 'Health' },
  { name: 'growth', label: 'Growth' },
]

const NAV_PHONE =
  'inset-x-0 bottom-0 h-[calc(58px+env(safe-area-inset-bottom))] grid-cols-4 border-t pb-[env(safe-area-inset-bottom)]'
const NAV_LAND = 'inset-y-0 left-0 w-[60px] grid-cols-1 auto-rows-fr border-r'

function TabButton({
  icon,
  label,
  pressed,
  land,
  onClick,
}: {
  icon: keyof typeof ICONS
  label: string
  pressed?: boolean
  land: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        'group flex min-h-11 min-w-0 flex-col items-center justify-center font-semibold text-stone focus-visible:outline-2 focus-visible:-outline-offset-[3px] focus-visible:outline-forest-mid aria-pressed:text-forest-ink',
        land ? 'gap-px text-[10px]' : 'gap-[3px] text-[11px]',
      )}
    >
      <span
        className={cn(
          'inline-flex items-center justify-center rounded-full transition-colors duration-[180ms] group-active:bg-sand-track group-aria-pressed:bg-forest-deep group-aria-pressed:text-white motion-reduce:transition-none',
          land ? 'h-[26px] w-10' : 'h-7 w-[52px]',
        )}
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="size-[21px] fill-none stroke-current stroke-[1.8] [stroke-linecap:round] [stroke-linejoin:round]"
        >
          <path d={ICONS[icon]} />
        </svg>
      </span>
      {label}
    </button>
  )
}

/** The handheld section tabs: a bottom bar on a phone, a left rail in short landscape. */
export function PhoneTabBar() {
  const mode = useAtomValue(layoutModeAtom)
  const relax = useAtomValue(relaxModeAtom)
  const active = useAtomValue(activeSheetAtom)
  const openSheet = useSetAtom(openSheetAtom)
  if (mode === 'desktop' || relax) return null
  const land = mode === 'land'

  return (
    <nav
      aria-label="Sections"
      className={cn('fixed z-[46] grid border-sand-border bg-paper', land ? NAV_LAND : NAV_PHONE)}
    >
      {SHEET_TABS.map((t) => (
        <TabButton
          key={t.name}
          icon={t.name}
          label={t.label}
          pressed={active === t.name}
          land={land}
          onClick={() => openSheet(active === t.name ? null : t.name)}
        />
      ))}
      <TabButton
        icon="relax"
        label="Relax"
        land={land}
        onClick={() => {
          openSheet(null)
          enterRelax()
        }}
      />
    </nav>
  )
}
