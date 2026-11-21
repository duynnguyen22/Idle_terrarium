export type SheetLevel = 'peek' | 'half' | 'full'

const LEVELS: SheetLevel[] = ['peek', 'half', 'full']
const TOP_BAR_PX = 48
const BOTTOM_BAR_PX = 58
const GAP_PX = 8
const MIN_FULL_PX = 200
const MIN_DRAG_PX = 60

/** Pixel height of a bottom sheet at `level` for a viewport `innerHeight` px tall. */
export function sheetLevelPx(level: SheetLevel, innerHeight: number): number {
  if (level === 'peek') return Math.round(innerHeight * 0.27)
  if (level === 'half') return Math.round(innerHeight * 0.54)
  return Math.max(MIN_FULL_PX, innerHeight - TOP_BAR_PX - BOTTOM_BAR_PX - GAP_PX)
}

/** The level a tap on the sheet handle moves to. */
export function nextTapLevel(level: SheetLevel): SheetLevel {
  return level === 'peek' ? 'half' : level === 'half' ? 'full' : 'half'
}

/** Where a released drag lands: the nearest level (earlier wins a tie), or 'close' when too low. */
export function snapDraggedSheet(px: number, innerHeight: number): SheetLevel | 'close' {
  if (px < sheetLevelPx('peek', innerHeight) * 0.62) return 'close'
  let best: SheetLevel = 'peek'
  for (const level of LEVELS) {
    if (
      Math.abs(sheetLevelPx(level, innerHeight) - px) <
      Math.abs(sheetLevelPx(best, innerHeight) - px)
    )
      best = level
  }
  return best
}

/** Keeps a live drag height between the minimum and the full level. */
export function clampDragPx(px: number, innerHeight: number): number {
  return Math.max(MIN_DRAG_PX, Math.min(sheetLevelPx('full', innerHeight), px))
}
