import { useAtomValue, useSetAtom } from 'jotai'
import { XIcon } from 'lucide-react'
import { useEffect, useId } from 'react'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'
import { tryGetWorld } from '@/engine/engineBridge'
import { clearRings, pingItem, PING_MS, setRings } from '@/engine/marks'
import { focusOn } from '@/engine/view'
import { paceMs } from '@/engine/simulation/pace'
import {
  dotColour,
  durationLabel,
  etaLabel,
  restLine,
  sinceLabel,
  type AwayReport,
} from '@/engine/simulation/report'
import { startEveningVisit } from '@/store/awayFlow'
import { appStore } from '@/store/appStore'
import { awayIndexAtom } from '@/store/overlay'
import { awayLogAtom, paceAtom, relaxModeAtom, selectedIdAtom } from '@/store/studio'

/** A click's close-up: the camera eases to the item for 3.2 s, then returns. */
function closeUp(uids: string[]): void {
  const world = tryGetWorld()
  if (world) focusOn(world.view, uids, 2, 3200, performance.now())
}

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

/** The time-away summary: what changed while the player was gone (or after a preview or "+1 day"). */
export function AwayCard() {
  const titleId = useId()
  const awayIndex = useAtomValue(awayIndexAtom)
  const awayLog = useAtomValue(awayLogAtom)
  const pace = useAtomValue(paceAtom)
  const setAwayIndex = useSetAtom(awayIndexAtom)
  const report = awayIndex === null ? undefined : awayLog[awayIndex]

  // Dashed rings around everything the card mentions, for as long as it is showing this page.
  useEffect(() => {
    const world = tryGetWorld()
    if (!world || !report) return
    const here = new Set(world.items.map((i) => i.uid))
    const uids = report.items
      .map((i) => i.uid)
      .concat(report.hints.map((h) => h.uid))
      .filter((uid, i, all) => here.has(uid) && all.indexOf(uid) === i)
    setRings(world, uids)
    return () => clearRings(world)
  }, [awayIndex, report])

  const open = report !== undefined
  useEffect(() => {
    if (!open) return
    // Capture phase + stopPropagation: Escape closes the card only, not relax mode or the selection.
    // Relax mode hides the card, so there Escape is left to leave relax mode.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || appStore.get(relaxModeAtom)) return
      e.stopPropagation()
      setAwayIndex(null)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open, setAwayIndex])

  if (awayIndex === null || !report) return null

  const ping = (uid: string) => {
    const world = tryGetWorld()
    if (world) pingItem(world, uid, PING_MS)
  }
  const select = (uid: string) => {
    appStore.set(selectedIdAtom, uid)
    closeUp([uid])
  }
  const msPerDay = paceMs(pace)
  const empty = report.items.length === 0 && report.rest.length === 0
  const here = new Set(tryGetWorld()?.items.map((i) => i.uid))
  const canVisit = report.items.some((i) => here.has(i.uid))

  return (
    <section
      id="away-card"
      role="dialog"
      aria-labelledby={titleId}
      className="absolute top-4 left-4 z-30 flex max-h-[calc(100%-2rem)] w-[21rem] max-w-[calc(100%-2rem)] flex-col gap-4 overflow-y-auto rounded-[22px] border border-sand-border bg-paper p-5 text-ink-deep shadow-[0_18px_44px_-20px_rgba(17,34,26,0.45)]"
    >
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
          onClick={() => setAwayIndex(null)}
          className="-mt-1 -mr-1.5 shrink-0 text-stone hover:bg-forest-ink/5 hover:text-forest-ink"
        >
          <XIcon />
        </Button>
      </header>

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

      {report.hints.length > 0 && (
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
      )}

      <div className="flex items-center gap-2">
        {canVisit && (
          <Button
            onClick={() => startEveningVisit(report)}
            className="h-10 flex-1 rounded-xl bg-forest-ink text-[13.5px] font-semibold text-white hover:bg-forest-deep"
          >
            Start the evening visit
          </Button>
        )}
        <Button
          variant="outline"
          onClick={() => setAwayIndex(null)}
          className={cn(
            'h-10 rounded-xl border-sand-border bg-white px-5 text-[13.5px] font-semibold text-forest-ink hover:bg-linen hover:text-forest-ink',
            !canVisit && 'flex-1',
          )}
        >
          Got it
        </Button>
      </div>

      {awayLog.length >= 2 && (
        <nav
          aria-label="Away reports"
          className="-mx-5 -mb-2 flex items-center justify-between border-t border-card-line px-3 pt-2"
        >
          <Button
            variant="ghost"
            size="sm"
            className={PAGER}
            disabled={awayIndex >= awayLog.length - 1}
            onClick={() => setAwayIndex(awayIndex + 1)}
          >
            ‹ Earlier
          </Button>
          <span className="text-[12.5px] text-stone">
            {awayIndex === 0 ? 'Latest' : `${awayIndex + 1} of ${awayLog.length}`}
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
      )}
    </section>
  )
}
