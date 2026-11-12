import { useAtom } from 'jotai'
import { isEvening } from '@/hooks/useTour'
import { tourAtom } from '@/store/overlay'

/** Caption for the evening visit: where we are in the tour, the line for this item, and a Skip button. */
export function TourCaption() {
  const [tour, setTour] = useAtom(tourAtom)
  if (!tour) return null

  const step = tour.steps[tour.i]
  const pos = step
    ? `${isEvening() ? 'Tonight' : 'Since last time'} · ${tour.i + 1} of ${tour.steps.length}`
    : null

  return (
    <section
      id="tour-caption"
      aria-label="Evening visit"
      aria-live="polite"
      className="pointer-events-none absolute bottom-20 left-1/2 z-40 flex w-max max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-3 rounded-full bg-forest-night/90 py-2 pl-5 pr-2 text-white shadow-[0_12px_32px_-12px_rgba(0,0,0,0.55)] sm:bottom-24"
    >
      <div className="min-w-0">
        {pos && (
          <p className="tour-pos text-[11px] font-semibold uppercase tracking-wide text-sage">
            {pos}
          </p>
        )}
        <p className="tour-text text-sm text-white">
          {step ? step.text : 'Nothing new to look at yet. Enjoy the quiet.'}
        </p>
      </div>
      <button
        type="button"
        onClick={() => setTour(null)}
        className="pointer-events-auto inline-flex h-8 shrink-0 items-center rounded-full bg-white/10 px-3 text-xs font-semibold text-white transition hover:bg-white/20"
      >
        Skip
      </button>
    </section>
  )
}
