import { useAtomValue, useSetAtom } from 'jotai'
import { useEffect } from 'react'
import { layoutModeAtom, layoutModeFor, viewportHeightAtom } from '@/store/layout'

const PHONE_QUERY = '(max-width: 640px)'
const LAND_QUERY = '(max-height: 480px) and (orientation: landscape) and (max-width: 960px)'

type Mql = MediaQueryList

function listen(mql: Mql, apply: () => void): () => void {
  if (typeof mql.addEventListener === 'function') {
    mql.addEventListener('change', apply)
    return () => mql.removeEventListener('change', apply)
  }
  mql.addListener(apply)
  return () => mql.removeListener(apply)
}

/** Mirrors the phone and landscape media queries and the viewport height into the layout atoms (not persisted). */
export function useLayoutMode(): void {
  const setMode = useSetAtom(layoutModeAtom)
  const setHeight = useSetAtom(viewportHeightAtom)
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const phone = window.matchMedia(PHONE_QUERY)
    const land = window.matchMedia(LAND_QUERY)
    const apply = () => setMode(layoutModeFor(phone.matches, land.matches))
    const onResize = () => setHeight(window.innerHeight)
    apply()
    onResize()
    const offPhone = listen(phone, apply)
    const offLand = listen(land, apply)
    window.addEventListener('resize', onResize)
    return () => {
      offPhone()
      offLand()
      window.removeEventListener('resize', onResize)
    }
  }, [setMode, setHeight])

  // Re-read once the layout for a new mode has rendered. A mobile browser zooms the layout
  // viewport out to fit the wide desktop first render, so the read above can be twice the real
  // height, and it shrinks back for the phone layout without firing a resize event.
  const mode = useAtomValue(layoutModeAtom)
  useEffect(() => setHeight(window.innerHeight), [mode, setHeight])
}
