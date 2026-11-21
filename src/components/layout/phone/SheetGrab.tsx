import { useAtomValue, useSetAtom } from 'jotai'
import { cn } from 'cn'
import { type MouseEvent, type PointerEvent, useEffect, useRef } from 'react'
import { clampDragPx, nextTapLevel, sheetLevelPx, snapDraggedSheet } from '@/lib/sheetMath'
import { openSheetAtom, sheetDragPxAtom, sheetLevelAtom, viewportHeightAtom } from '@/store/layout'

/** A move counts as a drag only once the pointer travels further than this. */
const DRAG_START_PX = 6

type Gesture = { pointerId: number; startY: number; startH: number; dragPx: number | null }

/**
 * The phone sheet's grab handle (prototype .m-grab): a tap steps the level, a drag resizes the
 * sheet live and snaps to the nearest level on release, or closes it when dragged low enough.
 */
export function SheetGrab({ className }: { className?: string }) {
  const level = useAtomValue(sheetLevelAtom)
  const innerHeight = useAtomValue(viewportHeightAtom)
  const setLevel = useSetAtom(sheetLevelAtom)
  const setDragPx = useSetAtom(sheetDragPxAtom)
  const openSheet = useSetAtom(openSheetAtom)
  const gesture = useRef<Gesture | null>(null)

  // A grab that unmounts mid-drag (rotation, mode change) must not leave the drag height behind.
  useEffect(() => () => setDragPx(null), [setDragPx])

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    const startH = sheetLevelPx(level, innerHeight)
    gesture.current = { pointerId: e.pointerId, startY: e.clientY, startH, dragPx: null }
    if (typeof e.currentTarget.setPointerCapture === 'function') {
      e.currentTarget.setPointerCapture(e.pointerId)
    }
  }

  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    const g = gesture.current
    if (!g || g.pointerId !== e.pointerId) return
    const dy = g.startY - e.clientY
    if (g.dragPx === null && Math.abs(dy) <= DRAG_START_PX) return
    g.dragPx = clampDragPx(g.startH + dy, innerHeight)
    setDragPx(g.dragPx)
  }

  const onPointerUp = (e: PointerEvent<HTMLButtonElement>) => {
    const g = gesture.current
    if (!g || g.pointerId !== e.pointerId) return
    gesture.current = null
    setDragPx(null)
    const next = g.dragPx === null ? nextTapLevel(level) : snapDraggedSheet(g.dragPx, innerHeight)
    if (next === 'close') openSheet(null)
    else setLevel(next)
  }

  const onPointerCancel = () => {
    gesture.current = null
    setDragPx(null)
  }

  // Pointer taps step in onPointerUp; a keyboard click (Enter or Space) has detail 0.
  const onClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (e.detail === 0) setLevel(nextTapLevel(level))
  }

  return (
    <button
      type="button"
      aria-label="Resize this panel. Tap to change its height, drag down to close"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onLostPointerCapture={onPointerCancel}
      onClick={onClick}
      className={cn(
        'group flex h-[26px] w-full flex-none cursor-grab touch-none items-center justify-center bg-paper [-webkit-tap-highlight-color:transparent]',
        className,
      )}
    >
      <i className="h-1 w-10 rounded-full bg-[#c3cbbf] group-active:bg-[#8a968c]" />
    </button>
  )
}
