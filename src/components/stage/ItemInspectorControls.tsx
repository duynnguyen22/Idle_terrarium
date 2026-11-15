import { cn } from 'cn'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import type { PlacedItem } from '@/data/types'
import { advanceGrowth, flipItem, reorderItem, rotateItem, scaleItem } from '@/engine/items'
import type { EngineWorld } from '@/engine/world'
import { play } from '@/services/audio'

/** Runs a mutation on the live world and re-renders the inspector. */
type ApplyMutation = (fn: (w: EngineWorld) => void) => void

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
    <Button
      variant="ghost"
      size="icon"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={cn('hover:bg-white', className)}
    >
      <Icon>{children}</Icon>
    </Button>
  )
}

/** Size, rotation, flip and stacking order for the selected item. */
export function TransformButtons({ uid, apply }: { uid: string; apply: ApplyMutation }) {
  return (
    <div className="flex items-center gap-1">
      <InspectorButton title="Smaller" onClick={() => apply((w) => scaleItem(w, uid, -1))}>
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
        <line x1="8" y1="11" x2="14" y2="11" />
      </InspectorButton>
      <InspectorButton title="Larger" onClick={() => apply((w) => scaleItem(w, uid, 1))}>
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
        <line x1="11" y1="8" x2="11" y2="14" />
        <line x1="8" y1="11" x2="14" y2="11" />
      </InspectorButton>
      <InspectorButton
        title="Rotate Counter-Clockwise"
        onClick={() => apply((w) => rotateItem(w, uid, -1))}
      >
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
      </InspectorButton>
      <InspectorButton title="Rotate Clockwise" onClick={() => apply((w) => rotateItem(w, uid, 1))}>
        <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
        <path d="M21 3v5h-5" />
      </InspectorButton>
      <InspectorButton title="Flip Horizontally" onClick={() => apply((w) => flipItem(w, uid))}>
        <path d="M17 3l4 4-4 4" />
        <path d="M3 7h18" />
        <path d="M7 21l-4-4 4-4" />
        <path d="M21 17H3" />
      </InspectorButton>
      <InspectorButton title="Send Backward" onClick={() => apply((w) => reorderItem(w, uid, -1))}>
        <path d="M12 5v14" />
        <path d="M19 12l-7 7-7-7" />
      </InspectorButton>
      <InspectorButton title="Bring Forward" onClick={() => apply((w) => reorderItem(w, uid, 1))}>
        <path d="M12 19V5" />
        <path d="M5 12l7-7 7 7" />
      </InspectorButton>
    </div>
  )
}

/** Advance growth (plants only), duplicate and remove. */
export function SpecimenButtons({
  item,
  apply,
  onDuplicate,
  onDelete,
}: {
  item: PlacedItem
  apply: ApplyMutation
  onDuplicate: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-center gap-1">
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
  )
}
