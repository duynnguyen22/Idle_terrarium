import { CatalogGrid } from '@/components/catalog/CatalogGrid'
import { PlantingStageToggle } from '@/components/catalog/PlantingStageToggle'
import { VesselTab } from '@/components/catalog/VesselTab'
import { selectActiveTab } from '@/store/selectors'
import { useStudioStore } from '@/store/useStudioStore'

const TABS = [
  { id: 'vessel', icon: '🫙', label: 'Vessel & Soil' },
  { id: 'flora', icon: '🌿', label: 'Flora' },
  { id: 'hardscape', icon: '🪨', label: 'Hardscape' },
  { id: 'fauna', icon: '🐸', label: 'Fauna' },
] as const

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
      className={`z-20 flex w-80 shrink-0 flex-col border-r border-sand-border bg-paper md:w-96 max-lg:absolute max-lg:inset-y-0 max-lg:left-0 max-lg:max-w-[85vw] max-lg:shadow-xl max-lg:transition-[transform,visibility] motion-reduce:max-lg:transition-none ${
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
              <span className="mb-0.5 text-base">{t.icon}</span>
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
