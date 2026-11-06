import { selectActiveTab } from '@/store/selectors'
import { useStudioStore } from '@/store/useStudioStore'

const TABS = [
  { id: 'vessel', icon: '🫙', label: 'Vessel & Soil' },
  { id: 'flora', icon: '🌿', label: 'Flora' },
  { id: 'hardscape', icon: '🪨', label: 'Hardscape' },
  { id: 'fauna', icon: '🐸', label: 'Fauna' },
] as const

/** Tab-bar shell; the panels for each tab arrive in Task 8. */
export function LeftSidebar() {
  const activeTab = useStudioStore(selectActiveTab)
  const setActiveTab = useStudioStore((s) => s.setActiveTab)
  return (
    <aside
      id="left-sidebar"
      className="z-20 flex w-80 shrink-0 flex-col border-r border-sand-border bg-paper md:w-96"
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
              aria-selected={active}
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
      {/* TODO(task-8): tab panels render here. */}
      <div className="flex-1 space-y-5 overflow-y-auto p-3.5" />
    </aside>
  )
}
