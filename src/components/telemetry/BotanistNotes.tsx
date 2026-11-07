import { computeCareReport, runCareAction, type CareIssue } from '@/engine/care'
import { mutateWorld } from '@/engine/engineBridge'
import { play } from '@/hooks/useAudio'
import { selectTelemetry } from '@/store/selectors'
import { showToast } from '@/store/toastStore'
import { useStudioStore } from '@/store/useStudioStore'

/** All-clear note keyed on how fogged the glass is (prototype renderTelemetry). */
function allClearNote(condensation: number): string {
  if (condensation > 0.55)
    return 'Everything is in range. Heavier fog overnight is normal as the glass cools; it should clear once the lamp is on.'
  if (condensation > 0.18)
    return 'Everything is in range. A light fog that forms and clears on its own means the water balance is right.'
  return 'Everything is in range. Mist now and then if the glass stays clear for days.'
}

const DOT: Record<CareIssue['level'] | 'ok', string> = {
  ok: 'bg-emerald-700',
  warn: 'bg-orange-700',
  info: 'bg-blue-700',
}

function runAction(action: NonNullable<CareIssue['action']>) {
  let msg = ''
  mutateWorld((w) => {
    msg = runCareAction(w, useStudioStore.getState(), action.id)
    // Recompute now so the fixed issue doesn't linger until the next throttled telemetry push.
    const store = useStudioStore.getState()
    w.careIssues = computeCareReport({ ...store, ...w.env, items: w.items })
    store.setTelemetry({ careIssues: w.careIssues })
  })
  if (action.id === 'feed') play('chime')
  showToast(msg)
}

/** "Next step" card: the top issue (first warning, else first note) with its one-click fix. */
export function BotanistNotes() {
  const { careIssues, condensation } = useStudioStore(selectTelemetry)
  const top = careIssues.find((i) => i.level === 'warn') ?? careIssues[0]
  const action = top?.action
  return (
    <div className="rounded-2xl bg-mint-light p-3.5">
      <div className="mb-1 text-xs font-semibold text-forest-ink">Next step</div>
      <p className="text-xs leading-relaxed text-forest-slate">
        {top ? top.text : allClearNote(condensation)}
      </p>
      {action && (
        <button
          type="button"
          onClick={() => runAction(action)}
          className="mt-2.5 h-8 rounded-lg bg-forest-deep px-3 text-xs font-semibold text-white transition hover:bg-forest-dark"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

/** "Inhabitants" list: every care issue, or an all-clear line. */
export function CareList() {
  const { careIssues } = useStudioStore(selectTelemetry)
  return (
    <div className="rounded-2xl border border-sand-border bg-white p-3.5">
      <div className="mb-2 text-xs font-semibold text-forest-ink">Inhabitants</div>
      <ul className="space-y-2 text-xs leading-snug text-ink-soft">
        {careIssues.length === 0 ? (
          <li className="flex gap-2">
            <span
              aria-hidden="true"
              className={`mt-[5px] size-[7px] shrink-0 rounded-full ${DOT.ok}`}
            />
            <span>Every plant and animal is in its range.</span>
          </li>
        ) : (
          careIssues.map((issue, i) => (
            <li key={`${i}-${issue.text}`} className="flex gap-2">
              <span
                aria-hidden="true"
                className={`mt-[5px] size-[7px] shrink-0 rounded-full ${DOT[issue.level]}`}
              />
              <span>{issue.text}</span>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}
