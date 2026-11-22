import { useAtomValue, useSetAtom } from 'jotai'
import { cn } from 'cn'
import { MoreMenu } from '@/components/nav/MoreMenu'
import { enterRelax } from '@/components/nav/studioActions'
import { activeSheetAtom, layoutModeAtom, openSheetAtom, type SheetName } from '@/store/layout'
import { relaxModeAtom } from '@/store/studio'
import { TabButton } from './TabButton'

/** `controls` names the sidebar a tab opens, so closing it returns focus to the tab. */
const SHEET_TABS: { name: SheetName; label: string; controls?: string }[] = [
  { name: 'build', label: 'Build', controls: 'left-sidebar' },
  { name: 'health', label: 'Health', controls: 'right-sidebar' },
  { name: 'growth', label: 'Growth' },
]

const NAV_PHONE =
  'inset-x-0 bottom-0 h-[calc(58px+env(safe-area-inset-bottom))] grid-cols-4 border-t pb-[env(safe-area-inset-bottom)]'
const NAV_LAND = 'inset-y-0 left-0 w-[60px] grid-cols-1 auto-rows-fr border-r'

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
          aria-controls={t.controls}
          aria-expanded={t.controls ? active === t.name : undefined}
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
      {land && <MoreMenu trigger="rail" />}
    </nav>
  )
}
