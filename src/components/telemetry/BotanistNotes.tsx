import { useAtomValue } from 'jotai'
import { Button } from '@/components/ui/button'
import { computeCareReport, runCareAction, type CareIssue } from '@/engine/care'
import { mutateWorld } from '@/engine/engineBridge'
import { play } from '@/hooks/useAudio'
import { appStore } from '@/store/appStore'
import { studioStateAtom } from '@/store/studio'
import { telemetryAtom } from '@/store/telemetry'
import { showToast } from '@/store/toast'

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
    msg = runCareAction(w, appStore, action.id)
    // Recompute now so the fixed issue doesn't linger until the next throttled telemetry push.
    const store = appStore.get(studioStateAtom)
    w.careIssues = computeCareReport({
      ...store,
      ...w.env,
      items: w.items,
      mineralSpots: w.mineralSpots,
    })
    appStore.set(telemetryAtom, { careIssues: w.careIssues })
  })
  if (action.id === 'feed') play('chime')
  showToast(msg)
}

/** "Next step" card: the top issue (first warning, else first note) with its one-click fix. */
export function BotanistNotes() {
  const { careIssues, condensation } = useAtomValue(telemetryAtom)
  const top = careIssues.find((i) => i.level === 'warn') ?? careIssues[0]
  const action = top?.action
  return (
    <div className="rounded-2xl bg-mint-step p-3.5">
      <div className="mb-1 text-xs font-semibold text-forest-ink">Next step</div>
      <p className="text-xs leading-relaxed text-forest-slate">
        {top ? top.text : allClearNote(condensation)}
      </p>
      {action && (
        <Button
          onClick={() => runAction(action)}
          className="mt-2.5 px-3 text-xs font-semibold hover:bg-forest-dark"
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}

/** "Inhabitants" list: every care issue, or an all-clear line. */
export function CareList() {
  const { careIssues } = useAtomValue(telemetryAtom)
  return (
    <div className="rounded-2xl border border-card-line bg-white p-3.5">
      <div className="mb-2 text-xs font-semibold text-forest-ink">Inhabitants</div>
      <ul className="flex flex-col gap-2 text-xs leading-snug text-ink-soft">
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
