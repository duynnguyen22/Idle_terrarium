import { useEffect, useId } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { tryGetWorld } from '@/engine/engineBridge'
import { clearRings, pingItem, PING_MS, setRings } from '@/engine/marks'
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
import { useOverlayStore } from '@/store/useOverlayStore'
import { useStudioStore } from '@/store/useStudioStore'

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
      className="mt-1 size-2 shrink-0 rounded-full"
      style={{ backgroundColor: colour }}
    />
  )
}

const pagerBtn =
  'rounded-lg px-2 py-1 text-xs font-semibold text-forest-ink transition hover:bg-forest-ink/10 disabled:cursor-default disabled:text-stone/50 disabled:hover:bg-transparent'

/** The time-away summary: what changed while the player was gone (or after a preview or "+1 day"). */
export function AwayCard() {
  const titleId = useId()
  const awayIndex = useOverlayStore((s) => s.awayIndex)
  const awayLog = useStudioStore((s) => s.awayLog)
  const pace = useStudioStore((s) => s.pace)
  const { closeAway, setAwayIndex } = useOverlayStore(
    useShallow((s) => ({ closeAway: s.closeAway, setAwayIndex: s.setAwayIndex })),
  )
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
      if (e.key !== 'Escape' || useStudioStore.getState().relaxMode) return
      e.stopPropagation()
      closeAway()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open, closeAway])

  if (awayIndex === null || !report) return null

  const ping = (uid: string) => {
    const world = tryGetWorld()
    if (world) pingItem(world, uid, PING_MS)
  }
  const select = (uid: string) => useStudioStore.getState().selectItem(uid)
  const msPerDay = paceMs(pace)
  const empty = report.items.length === 0 && report.rest.length === 0
  const here = new Set(tryGetWorld()?.items.map((i) => i.uid))
  const canVisit = report.items.some((i) => here.has(i.uid))

  return (
    <section
      id="away-card"
      role="dialog"
      aria-labelledby={titleId}
      className="absolute left-1/2 top-20 z-30 w-[22rem] max-w-[calc(100%-2rem)] -translate-x-1/2 space-y-3 rounded-2xl border border-card-line bg-white p-3.5 shadow-lg"
    >
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-stone">
          {eyebrowOf(report)}
        </p>
        <h2 id={titleId} className="mt-0.5 text-sm font-semibold text-forest-ink">
          {titleOf(report)}
        </h2>
      </div>

      {empty ? (
        <p className="text-xs text-stone">
          The tank rested while you were away. Nothing needs doing.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {report.items.map((item) => (
            <li key={`${item.kind}|${item.id}`}>
              <button
                type="button"
                onMouseEnter={() => ping(item.uid)}
                onClick={() => select(item.uid)}
                className="flex w-full items-start gap-2 rounded-lg text-left text-xs text-forest-ink hover:bg-forest-ink/5"
              >
                <Dot colour={dotColour(item.kind)} />
                <span>{item.text}</span>
              </button>
            </li>
          ))}
          {report.rest.length > 0 && (
            <li className="flex items-start gap-2 text-xs text-forest-ink">
              <Dot colour={dotColour('rest')} />
              <span>{restLine(report.rest)}</span>
            </li>
          )}
        </ul>
      )}
      {report.more > 0 && (
        <p className="text-xs text-stone">
          {`And ${report.more} smaller change${report.more === 1 ? '' : 's'}.`}
        </p>
      )}

      {report.hints.length > 0 && (
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-stone">
            Coming up, if it stays healthy
          </h3>
          <ul className="mt-1 space-y-1">
            {report.hints.map((hint) => (
              <li key={hint.uid}>
                <button
                  type="button"
                  onMouseEnter={() => ping(hint.uid)}
                  onClick={() => select(hint.uid)}
                  className="w-full rounded-lg text-left text-xs text-stone hover:bg-forest-ink/5"
                >
                  {`${hint.text} ${etaLabel(hint.eta, msPerDay)}`}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        {awayLog.length >= 2 ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              className={pagerBtn}
              disabled={awayIndex >= awayLog.length - 1}
              onClick={() => setAwayIndex(awayIndex + 1)}
            >
              ‹ Earlier
            </button>
            <span className="text-[11px] text-stone">
              {awayIndex === 0 ? 'Latest' : `${awayIndex + 1} of ${awayLog.length}`}
            </span>
            <button
              type="button"
              className={pagerBtn}
              disabled={awayIndex <= 0}
              onClick={() => setAwayIndex(awayIndex - 1)}
            >
              Later ›
            </button>
          </div>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-1.5">
          {canVisit && (
            <button
              type="button"
              onClick={() => startEveningVisit(report)}
              className="inline-flex h-8 shrink-0 items-center whitespace-nowrap rounded-lg px-3 text-xs font-semibold text-forest-ink transition hover:bg-forest-ink/10"
            >
              Start the evening visit
            </button>
          )}
          <button
            type="button"
            onClick={closeAway}
            className="inline-flex h-8 shrink-0 items-center whitespace-nowrap rounded-lg bg-wheat px-3 text-xs font-semibold text-wheat-ink transition hover:bg-wheat-hover"
          >
            Got it
          </button>
        </div>
      </div>
    </section>
  )
}
