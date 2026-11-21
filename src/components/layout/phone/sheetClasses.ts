import type { LayoutMode } from '@/store/layout'

/** Portrait phone: a bottom sheet above the tab bar, as tall as --sheet-h (prototype m-phone). */
const PHONE_SHEET =
  'fixed left-0 right-0 top-auto bottom-[calc(58px+env(safe-area-inset-bottom))] z-[44] h-[var(--sheet-h)] w-auto overflow-hidden rounded-t-[18px] border border-b-0 border-sand-border bg-paper shadow-[0_-18px_40px_-22px_rgba(20,40,28,.55)]'

/** Transform slides in 260 ms, height eases in 220 ms; visibility waits for the slide. */
const PHONE_TRANSITION =
  'transition-[transform,height,visibility] duration-[260ms,220ms,260ms] ease-[cubic-bezier(.2,.8,.2,1),ease,cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none'

/** Short landscape: a full-height panel beside the 60 px rail (prototype m-land). */
const LAND_PANEL =
  'fixed top-0 bottom-0 left-[60px] right-auto z-[44] w-[min(350px,54vw)] border-r border-sand-border bg-paper shadow-[18px_0_40px_-22px_rgba(20,40,28,.5)] transition-[transform,visibility] duration-[250ms] ease-[ease] motion-reduce:transition-none'

/**
 * Shell classes for a sidebar or the growth board on handheld layouts, or null on desktop so the
 * caller keeps its own classes. A closed panel slides out of view and is hidden from focus. While
 * the phone sheet's grab handle is dragged, the sheet follows the finger with no transition.
 */
export function sheetClasses(mode: LayoutMode, open: boolean, dragging = false): string | null {
  if (mode === 'phone') {
    const shell = `${PHONE_SHEET} ${dragging ? 'transition-none' : PHONE_TRANSITION}`
    return open ? shell : `${shell} invisible translate-y-[112%]`
  }
  if (mode === 'land') return open ? LAND_PANEL : `${LAND_PANEL} invisible -translate-x-[130%]`
  return null
}
