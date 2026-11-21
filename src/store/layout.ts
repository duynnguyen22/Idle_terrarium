import { atom } from 'jotai'
import { type SheetLevel, sheetLevelPx } from '@/lib/sheetMath'
import { drawerAtom, growthBoardOpenAtom, openGrowthBoardAtom } from './overlay'

export type LayoutMode = 'desktop' | 'phone' | 'land'
export type SheetName = 'build' | 'health' | 'growth'

// Transient layout state; never persisted.

/** Maps the phone and landscape media queries to a layout mode; landscape wins whenever its query matches. */
export function layoutModeFor(phoneMatches: boolean, landMatches: boolean): LayoutMode {
  if (landMatches) return 'land'
  return phoneMatches ? 'phone' : 'desktop'
}

export const layoutModeAtom = atom<LayoutMode>('desktop')
export const viewportHeightAtom = atom(800)
export const sheetLevelAtom = atom<SheetLevel>('half')
/** Live drag height in px while the sheet handle is held, else null. */
export const sheetDragPxAtom = atom<number | null>(null)

export const isHandheldAtom = atom((get) => get(layoutModeAtom) !== 'desktop')

export const activeSheetAtom = atom<SheetName | null>((get) => {
  if (get(growthBoardOpenAtom)) return 'growth'
  const drawer = get(drawerAtom)
  return drawer === 'left' ? 'build' : drawer === 'right' ? 'health' : null
})

export const sheetHeightPxAtom = atom((get) => {
  if (get(layoutModeAtom) !== 'phone' || get(activeSheetAtom) === null) return 0
  return get(sheetDragPxAtom) ?? sheetLevelPx(get(sheetLevelAtom), get(viewportHeightAtom))
})

/** Space the stage gives up to the sheet; it follows the level, not a drag in progress. */
export const stagePadPxAtom = atom((get) => {
  const level = get(sheetLevelAtom)
  if (get(layoutModeAtom) !== 'phone' || get(activeSheetAtom) === null || level === 'full') return 0
  return sheetLevelPx(level, get(viewportHeightAtom))
})

/** Opens a sheet (or closes all with null), replacing whichever was open. */
export const openSheetAtom = atom(
  null,
  (_get, set, name: SheetName | null, level: SheetLevel = 'half') => {
    set(drawerAtom, null)
    if (name !== 'growth') set(growthBoardOpenAtom, false)
    if (name === null) return
    set(sheetLevelAtom, level)
    if (name === 'build') set(drawerAtom, 'left')
    else if (name === 'health') set(drawerAtom, 'right')
    else set(openGrowthBoardAtom)
  },
)

/** On a phone, shrinks an open build sheet to its peek level so the stage stays reachable. */
export const peekBuildSheetAtom = atom(null, (get, set) => {
  if (get(layoutModeAtom) !== 'phone' || get(activeSheetAtom) !== 'build') return
  if (get(sheetLevelAtom) !== 'peek') set(sheetLevelAtom, 'peek')
})
