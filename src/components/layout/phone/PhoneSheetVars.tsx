import { useAtomValue } from 'jotai'
import { useEffect } from 'react'
import { sheetHeightPxAtom, stagePadPxAtom } from '@/store/layout'

/** Writes the sheet height and the stage's bottom padding onto #studio-root as CSS variables. */
export function PhoneSheetVars() {
  const sheetPx = useAtomValue(sheetHeightPxAtom)
  const padPx = useAtomValue(stagePadPxAtom)
  useEffect(() => {
    const root = document.getElementById('studio-root')
    if (!root) return
    root.style.setProperty('--sheet-h', `${sheetPx}px`)
    root.style.setProperty('--stage-pad', `${padPx}px`)
  }, [sheetPx, padPx])
  return null
}
