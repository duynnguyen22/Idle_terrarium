import { useAtomValue, useSetAtom } from 'jotai'
import { useEffect, useId } from 'react'
import {
  AwayActions,
  AwayCardHeader,
  AwayChanges,
  AwayHints,
  AwayPager,
} from '@/components/stage/AwayCardSections'
import { tryGetWorld } from '@/engine/engineBridge'
import { clearRings, pingItem, PING_MS, setRings } from '@/engine/marks'
import { focusOn } from '@/engine/view'
import { paceMs } from '@/engine/simulation/pace'
import { appStore } from '@/store/appStore'
import { awayIndexAtom } from '@/store/overlay'
import { awayLogAtom, paceAtom, relaxModeAtom, selectedIdAtom } from '@/store/studio'

/** A click's close-up: the camera eases to the item for 3.2 s, then returns. */
function closeUp(uids: string[]): void {
  const world = tryGetWorld()
  if (world) focusOn(world.view, uids, 2, 3200, performance.now())
}

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
      <AwayCardHeader report={report} titleId={titleId} onClose={() => setAwayIndex(null)} />

      <AwayChanges report={report} empty={empty} ping={ping} select={select} />

      {report.hints.length > 0 && (
        <AwayHints report={report} msPerDay={msPerDay} ping={ping} select={select} />
      )}

      <AwayActions report={report} canVisit={canVisit} onClose={() => setAwayIndex(null)} />

      {awayLog.length >= 2 && (
        <AwayPager awayIndex={awayIndex} count={awayLog.length} setAwayIndex={setAwayIndex} />
      )}
    </section>
  )
}
