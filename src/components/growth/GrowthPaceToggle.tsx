import { useAtomValue } from 'jotai'
import { cn } from 'cn'
import { PACE_LABELS, type PaceId } from '@/data/pace'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { layoutModeAtom } from '@/store/layout'
import { PACE_IDS } from './growthBoardConstants'

/** The four-way tank pace switch at the top of the Growth board. */
export function GrowthPaceToggle({
  pace,
  onChoose,
}: {
  pace: PaceId
  onChoose: (id: PaceId) => void
}) {
  const phone = useAtomValue(layoutModeAtom) === 'phone'
  return (
    <ToggleGroup
      type="single"
      variant="raised"
      spacing={0.75}
      aria-label="Tank pace"
      value={pace}
      // Pressing the chosen pace again sends '': keep it.
      onValueChange={(id) => id && onChoose(id as PaceId)}
      className="grid w-full grid-cols-4 rounded-[11px] bg-sand-light p-[3px]"
    >
      {PACE_IDS.map((id) => (
        <ToggleGroupItem
          key={id}
          value={id}
          className={cn(
            'h-[30px] min-w-0 rounded-lg text-xs font-semibold data-[state=on]:shadow-[0_1px_2px_rgba(20,40,28,.12)]',
            phone && 'h-10',
          )}
        >
          {PACE_LABELS[id]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
