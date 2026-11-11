import { mutateWorld } from '@/engine/engineBridge'
import { hasPool, randomLandX } from '@/engine/geometry'
import { catchUpSpan } from '@/engine/simulation/catchup'
import type { EventKind } from '@/engine/simulation/life'
import { paceMs } from '@/engine/simulation/pace'
import { durationLabel, type AwayReport } from '@/engine/simulation/report'
import { flushTelemetry } from '@/engine/simulation/telemetry'
import { refreshCareReport } from '@/engine/simulation/tick'
import { play } from '@/hooks/useAudio'
import { useAccountStore } from '@/store/useAccountStore'
import { useOverlayStore } from '@/store/useOverlayStore'
import { useStudioStore } from '@/store/useStudioStore'

/** Days after setup in which "+1 day" may grow a mold patch. */
const MOLD_DAYS = 3
const MOLD_CHANCE = 0.6

export interface JournalFromReport {
  note: string
  events: { kind: EventKind; text: string }[]
  key: string
}

/** The journal note, event list and dedupe key for one report (spec §Journal). */
export function journalFromReport(r: AwayReport): JournalFromReport {
  const events = r.items.map(({ kind, text }) => ({ kind, text }))
  const lead =
    r.mode === 'day' ? 'One day later' : `While you were away (${durationLabel(r.hours)})`
  const note = events.length
    ? `${lead}: ${events.map((e) => e.text).join(' ')}`
    : 'A quiet stretch. The tank rested while you were away.'
  return { note, events, key: `${r.mode}:${r.from}:${r.to}` }
}

/**
 * Logs the report (unless it is already the newest one), opens the card on it and, when asked and signed in
 * with a terrarium open, adds an automatic journal entry.
 */
export function recordReport(r: AwayReport, opts: { journal: boolean }): void {
  const studio = useStudioStore.getState()
  const last = studio.awayLog[0]
  if (!last || last.from !== r.from || last.to !== r.to || last.mode !== r.mode) {
    studio.pushAwayReport(r)
  }
  useOverlayStore.getState().openAway(0)
  const account = useAccountStore.getState()
  if (opts.journal && account.phase === 'cloud' && account.activeId) {
    const { note, events, key } = journalFromReport(r)
    account
      .addJournalEntry(note, true, { events, key })
      .catch((e: unknown) => account.handleCloudError(e))
  }
}

/**
 * The "+1 day" button: one whole tank day through the catch-up engine (with the early-days mold roll), the new
 * day's care report and counters flushed to the stores, a day report logged and its card opened. Returns the toast.
 */
export function plusOneDay(rng: () => number = Math.random, now: number = Date.now()): string {
  play('chime')
  let msg = ''
  let report: AwayReport | null = null
  mutateWorld((w) => {
    const state = useStudioStore.getState()
    const before = w.env.cycleProgress
    report = catchUpSpan(w, state, now - paceMs(state.pace), now, {
      mode: 'day',
      reason: '+1 day',
      away: false,
      preview: true,
      tankHours: 24,
    })
    const day = Math.floor(w.ecoTime) + 1
    if (day - state.setupDay <= MOLD_DAYS && rng() < MOLD_CHANCE) {
      const terrain = { substrates: state.substrates, waterSplit: state.waterSplit }
      w.moldPatches.push({ x: randomLandX(terrain, rng), size: 9 + rng() * 5 })
    }
    // The new day's issues, gauges and day count reach the stores now, not at the next throttled push.
    refreshCareReport(w, useStudioStore.getState())
    flushTelemetry(w, useStudioStore.getState())
    const s = useStudioStore.getState()
    const after = w.env.cycleProgress
    if (before < 1 && after >= 1) msg = `Day ${s.dayCount}: plants grew. The pool has cycled.`
    else {
      const cycling = hasPool(s.waterSplit) && after < 1
      msg = `Day ${s.dayCount}: plants grew${cycling ? ', pool still cycling' : ''}`
    }
  })
  if (report) recordReport(report, { journal: true })
  return msg
}
