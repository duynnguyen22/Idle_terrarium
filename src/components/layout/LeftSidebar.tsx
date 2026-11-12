import { useAtom } from 'jotai'
import { Tabs } from 'radix-ui'
import { CatalogGrid } from '@/components/catalog/CatalogGrid'
import { PlantingStageToggle } from '@/components/catalog/PlantingStageToggle'
import { RoomTab } from '@/components/catalog/RoomTab'
import { VesselTab } from '@/components/catalog/VesselTab'
import { TabIcon, type TabIconName } from '@/components/ui/StudioIcons'
import { activeTabAtom } from '@/store/studio'

/** Tab bar entries; each uses the artifact's two-tone tab icon of the same name. */
const TABS = [
  { id: 'vessel', label: 'Vessel' },
  { id: 'flora', label: 'Flora' },
  { id: 'hardscape', label: 'Hardscape' },
  { id: 'fauna', label: 'Fauna' },
  { id: 'room', label: 'Room' },
] as const satisfies readonly { id: TabIconName; label: string }[]

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
    case 'room':
      return <RoomTab />
    default:
      return <VesselTab />
  }
}

/** Sidebar: tab bar plus the active tab's panel. */
export function LeftSidebar({ drawerOpen = false }: { drawerOpen?: boolean }) {
  const [activeTab, setActiveTab] = useAtom(activeTabAtom)
  const select = (id: string) => setActiveTab(id as TabIconName)
  return (
    <Tabs.Root asChild value={activeTab} onValueChange={select}>
      <aside
        id="left-sidebar"
        data-drawer-open={drawerOpen}
        className={`z-20 max-lg:z-40 flex w-80 shrink-0 flex-col border-r border-sand-border bg-paper max-lg:absolute max-lg:inset-y-0 max-lg:left-0 max-lg:max-w-[85vw] max-lg:shadow-xl max-lg:transition-[transform,visibility] motion-reduce:max-lg:transition-none ${
          drawerOpen ? '' : 'max-lg:invisible max-lg:-translate-x-full'
        }`}
      >
        <Tabs.List className="grid grid-cols-5 gap-1 border-b border-sand-border bg-sand-light p-2">
          {TABS.map((t) => {
            const active = t.id === activeTab
            return (
              <Tabs.Trigger
                key={t.id}
                value={t.id}
                // Radix selects on mousedown and keyboard; a plain click (assistive tech) selects too.
                onClick={() => select(t.id)}
                className={`sidebar-tab flex flex-col items-center justify-center rounded-xl px-1 py-2 text-xs transition ${
                  active
                    ? 'bg-white font-semibold text-forest-deep shadow-xs'
                    : 'font-medium text-stone hover:bg-white/50'
                }`}
              >
                <span className="mb-1 inline-flex">
                  <TabIcon name={t.id} />
                </span>
                <span className="whitespace-nowrap text-[11px]">{t.label}</span>
              </Tabs.Trigger>
            )
          })}
        </Tabs.List>
        <Tabs.Content value={activeTab} className="flex-1 space-y-5 overflow-y-auto p-3.5">
          <ActivePanel tab={activeTab} />
        </Tabs.Content>
      </aside>
    </Tabs.Root>
  )
}
