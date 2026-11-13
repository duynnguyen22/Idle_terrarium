import { useAtomValue, useSetAtom } from 'jotai'
import { useEffect, useId } from 'react'
import { Button } from '@/components/ui/button'
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
import { appStore } from '@/store/appStore'
import { awayIndexAtom } from '@/store/overlay'
import { awayLogAtom, paceAtom, relaxModeAtom, selectedIdAtom } from '@/store/studio'

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

const GHOST = 'text-xs font-semibold text-forest-ink hover:bg-forest-ink/10 hover:text-forest-ink'

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
  const select = (uid: string) => appStore.set(selectedIdAtom, uid)
  const msPerDay = paceMs(pace)
  const empty = report.items.length === 0 && report.rest.length === 0
  const here = new Set(tryGetWorld()?.items.map((i) => i.uid))
  const canVisit = report.items.some((i) => here.has(i.uid))

  return (
    <section
      id="away-card"
      role="dialog"
      aria-labelledby={titleId}
      className="absolute left-1/2 top-20 z-30 w-[22rem] max-w-[calc(100%-2rem)] -translate-x-1/2 flex flex-col gap-3 rounded-2xl border border-card-line bg-white p-3.5 shadow-lg"
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
        <ul className="flex flex-col gap-1.5">
          {report.items.map((item) => (
            <li key={`${item.kind}|${item.id}`}>
              <Button
                variant="ghost"
                size="auto"
                onMouseEnter={() => ping(item.uid)}
                onClick={() => select(item.uid)}
                className="w-full items-start justify-start gap-2 text-left text-xs font-normal whitespace-normal text-forest-ink hover:bg-forest-ink/5 hover:text-forest-ink"
              >
                <Dot colour={dotColour(item.kind)} />
                <span>{item.text}</span>
              </Button>
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
          <ul className="mt-1 flex flex-col gap-1">
            {report.hints.map((hint) => (
              <li key={hint.uid}>
                <Button
                  variant="ghost"
                  size="auto"
                  onMouseEnter={() => ping(hint.uid)}
                  onClick={() => select(hint.uid)}
                  className="w-full justify-start text-left text-xs font-normal whitespace-normal text-stone hover:bg-forest-ink/5 hover:text-stone"
                >
                  {`${hint.text} ${etaLabel(hint.eta, msPerDay)}`}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        {awayLog.length >= 2 ? (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="xs"
              className={GHOST}
              disabled={awayIndex >= awayLog.length - 1}
              onClick={() => setAwayIndex(awayIndex + 1)}
            >
              ‹ Earlier
            </Button>
            <span className="text-[11px] text-stone">
              {awayIndex === 0 ? 'Latest' : `${awayIndex + 1} of ${awayLog.length}`}
            </span>
            <Button
              variant="ghost"
              size="xs"
              className={GHOST}
              disabled={awayIndex <= 0}
              onClick={() => setAwayIndex(awayIndex - 1)}
            >
              Later ›
            </Button>
          </div>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-1.5">
          {canVisit && (
            <Button
              variant="ghost"
              onClick={() => startEveningVisit(report)}
              className={`${GHOST} px-3`}
            >
              Start the evening visit
            </Button>
          )}
          <Button
            variant="wheat"
            onClick={() => setAwayIndex(null)}
            className="px-3 text-xs font-semibold"
          >
            Got it
          </Button>
        </div>
      </div>
    </section>
  )
}
