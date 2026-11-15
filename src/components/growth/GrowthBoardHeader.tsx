import { Button } from '@/components/ui/button'

/** The Growth board's title and its close button. */
export function GrowthBoardHeader({ titleId, onClose }: { titleId: string; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between gap-2.5">
      <div>
        <p className="font-mono text-[10.5px] uppercase tracking-[.06em] text-stone">
          Growth board
        </p>
        <h2
          id={titleId}
          className="mt-0.5 font-serif-title text-xl font-semibold leading-tight text-forest-ink"
        >
          How your tank is growing
        </h2>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Close the growth board"
        onClick={onClose}
        className="text-forest-ink hover:bg-sand-pale hover:text-forest-ink"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </Button>
    </div>
  )
}
