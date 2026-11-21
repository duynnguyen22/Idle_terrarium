import type { AwayReport } from '@/data/events'
import { XIcon } from 'lucide-react'
import { useAtomValue } from 'jotai'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'
import {
  dotColour,
  durationLabel,
  etaLabel,
  restLine,
  sinceLabel,
} from '@/engine/simulation/report'
import { startEveningVisit } from '@/services/awayFlow'
import { isHandheldAtom } from '@/store/layout'

function tankSpan(tankHours: number): string {
  const days = tankHours / 24
  if (days >= 1.5) return ` · ${Math.round(days)} tank days`
  if (days >= 0.75) return ' · 1 tank day'
  return ` · ${Math.round(tankHours)} tank hours`
}

function eyebrowOf(r: AwayReport): string {
  const dur = durationLabel(r.hours)
  if (r.mode === 'preview') return `Preview · ${dur} later`
  if (r.mode === 'day') return 'One tank day later'
  return `While you were away · ${dur}${tankSpan(r.tankHours)}${r.capped ? ' (capped)' : ''}`
}

function titleOf(r: AwayReport): string {
  const n = r.items.length + r.more
  if (n > 0) return `${n} change${n === 1 ? '' : 's'} since ${sinceLabel(r.from)}`
  if (r.rest.length === 0) return 'A quiet night'
  return `Resting since ${sinceLabel(r.from)}`
}

function Dot({ colour }: { colour: string }) {
  return (
    <span
      aria-hidden="true"
      className="mt-[0.45em] size-2 shrink-0 rounded-full"
      style={{ backgroundColor: colour }}
    />
  )
}

/** A change line: the whole row is a button that selects the item on the stage. */
const LINE =
  'w-full items-start justify-start gap-3 rounded-lg px-2 py-1.5 text-left text-[13.5px] leading-normal font-normal whitespace-normal text-ink-deep hover:bg-forest-ink/5 hover:text-ink-deep'

/** Earlier and Later in the footer. */
const PAGER =
  'text-[12.5px] font-semibold text-forest-ink hover:bg-forest-ink/5 hover:text-forest-ink disabled:text-stone-light'

/** Hovering a line pings its item; clicking selects it and takes the camera there. */
interface ItemLineActions {
  ping: (uid: string) => void
  select: (uid: string) => void
}

/** The eyebrow, the title and the close button. */
export function AwayCardHeader({
  report,
  titleId,
  onClose,
}: {
  report: AwayReport
  titleId: string
  onClose: () => void
}) {
  return (
    <header className="flex items-start gap-3">
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="font-mono text-[11px] font-medium leading-normal tracking-[0.08em] text-stone uppercase">
          {eyebrowOf(report)}
        </p>
        <h2
          id={titleId}
          className="font-heading text-[1.375rem] leading-[1.15] font-semibold tracking-[-0.01em] text-forest-ink"
        >
          {titleOf(report)}
        </h2>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Close"
        onClick={onClose}
        className="-mt-1 -mr-1.5 shrink-0 text-stone hover:bg-forest-ink/5 hover:text-forest-ink"
      >
        <XIcon />
      </Button>
    </header>
  )
}

/** The change lines and the resting line (or the empty message), then the count of smaller changes. */
export function AwayChanges({
  report,
  empty,
  ping,
  select,
}: { report: AwayReport; empty: boolean } & ItemLineActions) {
  return (
    <>
      {empty ? (
        <p className="text-[13.5px] leading-normal text-ink-soft">
          The tank rested while you were away. Nothing needs doing.
        </p>
      ) : (
        <ul className="-mx-2 flex flex-col">
          {report.items.map((item) => (
            <li key={`${item.kind}|${item.id}`}>
              <Button
                variant="ghost"
                size="auto"
                onMouseEnter={() => ping(item.uid)}
                onClick={() => select(item.uid)}
                className={LINE}
              >
                <Dot colour={dotColour(item.kind)} />
                <span>{item.text}</span>
              </Button>
            </li>
          ))}
          {report.rest.length > 0 && (
            <li className="flex items-start gap-3 px-2 py-1.5 text-[13.5px] leading-normal text-ink-soft">
              <Dot colour={dotColour('rest')} />
              <span>{restLine(report.rest)}</span>
            </li>
          )}
        </ul>
      )}
      {report.more > 0 && (
        <p className="-mt-2 text-[13px] text-stone">
          {`And ${report.more} smaller change${report.more === 1 ? '' : 's'}.`}
        </p>
      )}
    </>
  )
}

/** What comes next if the tank stays healthy, each with its ETA. */
export function AwayHints({
  report,
  msPerDay,
  ping,
  select,
}: { report: AwayReport; msPerDay: number } & ItemLineActions) {
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl bg-mint-pale px-4 py-3">
      <h3 className="text-[11.5px] font-semibold tracking-[0.04em] text-forest-mid uppercase">
        Coming up, if it stays healthy
      </h3>
      <ul className="-mx-1.5 flex flex-col">
        {report.hints.map((hint) => (
          <li key={hint.uid}>
            <Button
              variant="ghost"
              size="auto"
              onMouseEnter={() => ping(hint.uid)}
              onClick={() => select(hint.uid)}
              className="w-full justify-start rounded-lg px-1.5 py-1 text-left text-[13px] leading-normal font-normal whitespace-normal text-ink-soft hover:bg-forest-ink/5 hover:text-forest-ink"
            >
              {`${hint.text} ${etaLabel(hint.eta, msPerDay)}`}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Start the evening visit (when an item it mentions is still here) and Got it. */
export function AwayActions({
  report,
  canVisit,
  onClose,
}: {
  report: AwayReport
  canVisit: boolean
  onClose: () => void
}) {
  const touch = useAtomValue(isHandheldAtom) && 'h-11'
  return (
    <div className="flex items-center gap-2">
      {canVisit && (
        <Button
          onClick={() => startEveningVisit(report)}
          className={cn(
            'h-10 flex-1 rounded-xl bg-forest-ink text-[13.5px] font-semibold text-white hover:bg-forest-deep',
            touch,
          )}
        >
          Start the evening visit
        </Button>
      )}
      <Button
        variant="outline"
        onClick={onClose}
        className={cn(
          'h-10 rounded-xl border-sand-border bg-white px-5 text-[13.5px] font-semibold text-forest-ink hover:bg-linen hover:text-forest-ink',
          !canVisit && 'flex-1',
          touch,
        )}
      >
        Got it
      </Button>
    </div>
  )
}

/** Earlier and Later through the away log, with the page in between. */
export function AwayPager({
  awayIndex,
  count,
  setAwayIndex,
}: {
  awayIndex: number
  count: number
  setAwayIndex: (index: number) => void
}) {
  return (
    <nav
      aria-label="Away reports"
      className="-mx-5 -mb-2 flex items-center justify-between border-t border-card-line px-3 pt-2"
    >
      <Button
        variant="ghost"
        size="sm"
        className={PAGER}
        disabled={awayIndex >= count - 1}
        onClick={() => setAwayIndex(awayIndex + 1)}
      >
        ‹ Earlier
      </Button>
      <span className="text-[12.5px] text-stone">
        {awayIndex === 0 ? 'Latest' : `${awayIndex + 1} of ${count}`}
      </span>
      <Button
        variant="ghost"
        size="sm"
        className={PAGER}
        disabled={awayIndex <= 0}
        onClick={() => setAwayIndex(awayIndex - 1)}
      >
        Later ›
      </Button>
    </nav>
  )
}
