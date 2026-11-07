import { selectTelemetry } from '@/store/selectors'
import { useStudioStore } from '@/store/useStudioStore'

export function BotanistNotes() {
  const { careIssues } = useStudioStore(selectTelemetry)
  const top = careIssues.find((i) => i.level === 'warn') ?? careIssues[0]
  const note = top ? top.text : 'Everything is in range.'
  return (
    <div className="rounded-2xl border border-sage-light bg-mint-pale p-3.5">
      <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-forest-deep">
        Botanist Notes
      </div>
      <p className="text-xs leading-relaxed text-forest-slate">{note}</p>
    </div>
  )
}
