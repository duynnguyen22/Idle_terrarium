import { useReducer, type ReactNode } from 'react'
import { findCatalogDef } from '@/data/catalog'
import { mutateWorld, getWorld } from '@/engine/engineBridge'
import {
  advanceGrowth,
  deleteItem,
  duplicateItem,
  flipItem,
  reorderItem,
  rotateItem,
  scaleItem,
} from '@/engine/items'
import { play } from '@/hooks/useAudio'
import type { EngineWorld } from '@/engine/world'
import { selectRelaxMode, selectSelectedId } from '@/store/selectors'
import { useStudioStore } from '@/store/useStudioStore'

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

const BTN = 'inline-flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-white'

function InspectorButton({
  title,
  onClick,
  className = 'text-ink-soft',
  children,
}: {
  title: string
  onClick: () => void
  className?: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`${BTN} ${className}`}
    >
      <Icon>{children}</Icon>
    </button>
  )
}

/**
 * Floating specimen inspector. It reads the selected item from the live (mutable) world and re-renders after
 * each UI mutation (local tick plus the store snapshot mutateWorld commits), never per engine frame.
 */
export function ItemInspector() {
  const selectedId = useStudioStore(selectSelectedId)
  const relaxMode = useStudioStore(selectRelaxMode)
  useStudioStore((s) => s.worldSnapshot)
  const [, bump] = useReducer((n: number) => n + 1, 0)

  if (!selectedId || relaxMode) return null
  const item = getWorld().items.find((i) => i.uid === selectedId)
  if (!item) return null
  const def = findCatalogDef(item.id)

  const apply = (fn: (w: EngineWorld) => void) => {
    mutateWorld(fn)
    bump()
  }

  let meta: string = item.category.toUpperCase()
  if (item.category === 'flora') {
    meta += ` · ${(item.stage || 'mature').toUpperCase()} · ${Math.round(item.vitality || 98)}% HEALTH`
  } else if (item.category === 'fauna') {
    meta += ` · ${(item.aiState || 'wandering').toUpperCase()}`
  }

  const onDuplicate = () => {
    const { plantingStage, substrates, selectItem } = useStudioStore.getState()
    let uid: string | null = null
    apply((w) => {
      uid = duplicateItem(w, item.uid, plantingStage, substrates)?.uid ?? null
    })
    if (uid) {
      selectItem(uid)
      play('repot')
    }
  }

  const onDelete = () => {
    apply((w) => deleteItem(w, item.uid))
    useStudioStore.getState().selectItem(null)
    play('prune')
  }

  return (
    <div
      id="item-inspector"
      className="absolute left-1/2 top-4 z-30 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-sand-border bg-paper/95 px-3.5 py-2 shadow-xl backdrop-blur-md"
    >
      <div className="whitespace-nowrap border-r border-sand-border pr-2">
        <div className="flex items-center gap-1.5">
          <span data-testid="insp-name" className="text-xs font-bold text-forest-ink">
            {def ? def.name : 'Specimen'}
          </span>
          {item.parentUid && (
            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
              🪨 Mounted
            </span>
          )}
        </div>
        <div
          data-testid="insp-meta"
          className="text-[10px] font-semibold uppercase tracking-wider text-stone-light"
        >
          {meta}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <InspectorButton title="Smaller" onClick={() => apply((w) => scaleItem(w, item.uid, -1))}>
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <line x1="8" y1="11" x2="14" y2="11" />
        </InspectorButton>
        <InspectorButton title="Larger" onClick={() => apply((w) => scaleItem(w, item.uid, 1))}>
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <line x1="11" y1="8" x2="11" y2="14" />
          <line x1="8" y1="11" x2="14" y2="11" />
        </InspectorButton>
        <InspectorButton
          title="Rotate Counter-Clockwise"
          onClick={() => apply((w) => rotateItem(w, item.uid, -1))}
        >
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </InspectorButton>
        <InspectorButton
          title="Rotate Clockwise"
          onClick={() => apply((w) => rotateItem(w, item.uid, 1))}
        >
          <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
          <path d="M21 3v5h-5" />
        </InspectorButton>
        <InspectorButton
          title="Flip Horizontally"
          onClick={() => apply((w) => flipItem(w, item.uid))}
        >
          <path d="M17 3l4 4-4 4" />
          <path d="M3 7h18" />
          <path d="M7 21l-4-4 4-4" />
          <path d="M21 17H3" />
        </InspectorButton>
        <InspectorButton
          title="Send Backward"
          onClick={() => apply((w) => reorderItem(w, item.uid, -1))}
        >
          <path d="M12 5v14" />
          <path d="M19 12l-7 7-7-7" />
        </InspectorButton>
        <InspectorButton
          title="Bring Forward"
          onClick={() => apply((w) => reorderItem(w, item.uid, 1))}
        >
          <path d="M12 19V5" />
          <path d="M5 12l7-7 7 7" />
        </InspectorButton>
      </div>

      <div className="flex items-center gap-1 border-l border-sand-border pl-2">
        {item.category === 'flora' && (
          <InspectorButton
            title="Advance Growth Stage"
            className="border border-emerald-200 bg-emerald-50 text-emerald-800"
            onClick={() => {
              apply((w) => advanceGrowth(w, item.uid))
              play('chime')
            }}
          >
            <path d="M12 20V10" />
            <path d="M12 10C12 6 16 4 19 5C19 9 16 10 12 10Z" />
            <path d="M12 14C12 10 8 8 5 9C5 13 8 14 12 14Z" />
          </InspectorButton>
        )}
        <InspectorButton
          title="Duplicate Specimen"
          className="border border-amber-200 bg-amber-50 text-amber-900"
          onClick={onDuplicate}
        >
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </InspectorButton>
        <InspectorButton
          title="Remove Specimen"
          className="border border-rose-200 bg-rose-50 text-rose-700"
          onClick={onDelete}
        >
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </InspectorButton>
      </div>
    </div>
  )
}
