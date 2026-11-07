import { CatalogGrid } from '@/components/catalog/CatalogGrid'
import { PlantingStageToggle } from '@/components/catalog/PlantingStageToggle'
import { VesselTab } from '@/components/catalog/VesselTab'
import { selectActiveTab } from '@/store/selectors'
import { useStudioStore } from '@/store/useStudioStore'

/** Line icons from the v6 prototype's tab bar (24-unit viewBox, stroked). */
const TABS = [
  {
    id: 'vessel',
    icon: 'M8 3h8M7 6h10v13a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2zM7 11h10',
    label: 'Vessel & Soil',
  },
  {
    id: 'flora',
    icon: 'M12 21v-9M12 12c0-4 3-6 7-6c0 4-3 6-7 6zM12 14c0-3-2-5-6-5c0 3 2 5 6 5z',
    label: 'Flora',
  },
  { id: 'hardscape', icon: 'M3 18l3-8l5-3l6 2l4 9zM3 18h18', label: 'Hardscape' },
  {
    id: 'fauna',
    icon: 'M7 14a5 4 0 1 0 10 0a5 4 0 1 0-10 0zM8.5 9a1.5 1.5 0 1 0 .01 0M15.5 9a1.5 1.5 0 1 0 .01 0M5 18l-2 2M19 18l2 2',
    label: 'Fauna',
  },
] as const

function TabIcon({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  )
}

const BLURB = 'text-[11px] leading-relaxed text-stone'
const STRONG = 'font-semibold text-forest-deep'

function ActivePanel({ tab }: { tab: string }) {
  switch (tab) {
    case 'flora':
      return (
        <div className="space-y-3">
          <PlantingStageToggle />
          <p className={BLURB}>
            Click any plant to place it, or drag it onto{' '}
            <strong className={STRONG}>glowing green rock ledges</strong> to mount epiphytes onto
            cliffs and driftwood.
          </p>
          <CatalogGrid category="flora" />
        </div>
      )
    case 'hardscape':
      return (
        <div className="space-y-3">
          <p className={BLURB}>
            Build vertical moss walls, cascading root waterfalls, and golden river stone banks. Drag
            plants onto rock ledges to anchor them.
          </p>
          <CatalogGrid category="hardscape" />
        </div>
      )
    case 'fauna':
      return (
        <div className="space-y-3">
          <p className={BLURB}>
            Autonomous creatures wander, rest, graze moss, swim in the semi-aquatic lake, and clean
            up fungal spores.
          </p>
          <CatalogGrid category="fauna" />
        </div>
      )
    default:
      return <VesselTab />
  }
}

/** Sidebar: tab bar plus the active tab's panel. */
export function LeftSidebar({ drawerOpen = false }: { drawerOpen?: boolean }) {
  const activeTab = useStudioStore(selectActiveTab)
  const setActiveTab = useStudioStore((s) => s.setActiveTab)
  return (
    <aside
      id="left-sidebar"
      data-drawer-open={drawerOpen}
      className={`z-20 max-lg:z-40 flex w-80 shrink-0 flex-col border-r border-sand-border bg-paper md:w-96 max-lg:absolute max-lg:inset-y-0 max-lg:left-0 max-lg:max-w-[85vw] max-lg:shadow-xl max-lg:transition-[transform,visibility] motion-reduce:max-lg:transition-none ${
        drawerOpen ? '' : 'max-lg:invisible max-lg:-translate-x-full'
      }`}
    >
      <div
        role="tablist"
        className="grid grid-cols-4 gap-1 border-b border-sand-border bg-sand-light p-2"
      >
        {TABS.map((t) => {
          const active = t.id === activeTab
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`sidebar-tab-${t.id}`}
              aria-selected={active}
              aria-controls="sidebar-panel"
              onClick={() => setActiveTab(t.id)}
              className={`flex flex-col items-center justify-center rounded-xl px-1 py-2 text-xs transition ${
                active
                  ? 'bg-white font-semibold text-forest-deep shadow-xs'
                  : 'font-medium text-stone hover:bg-white/50'
              }`}
            >
              <span className="mb-1 inline-flex">
                <TabIcon d={t.icon} />
              </span>
              <span className="whitespace-nowrap text-[11px]">{t.label}</span>
            </button>
          )
        })}
      </div>
      <div
        role="tabpanel"
        id="sidebar-panel"
        aria-labelledby={`sidebar-tab-${activeTab}`}
        className="flex-1 space-y-5 overflow-y-auto p-3.5"
      >
        <ActivePanel tab={activeTab} />
      </div>
    </aside>
  )
}
