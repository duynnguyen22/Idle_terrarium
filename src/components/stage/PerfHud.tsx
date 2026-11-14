import { useAtomValue } from 'jotai'
import { perfHudAtom, perfTextAtom } from '@/store/view'

/**
 * Frame-rate readout (⋯ → Show frame rate), top left of the stage in studio and relax mode.
 * The engine writes the text every 20th frame. It ignores the pointer, so it may sit over the
 * away card's corner without blocking it.
 */
export function PerfHud() {
  const on = useAtomValue(perfHudAtom)
  const text = useAtomValue(perfTextAtom)
  if (!on) return null
  return (
    <output
      id="perf-hud"
      aria-live="off"
      className="pointer-events-none absolute top-2 left-2 z-50 rounded-md bg-forest-night/70 px-2 py-1 font-mono text-[11px] text-cream tabular-nums"
    >
      {text || '…'}
    </output>
  )
}
