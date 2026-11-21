import { useAtomValue, useSetAtom } from 'jotai'
import { cn } from 'cn'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { PumpFlow } from '@/data/types'
import { hasPool } from '@/engine/geometry'
import { layoutModeAtom } from '@/store/layout'
import { pumpFlowAtom, waterSplitAtom } from '@/store/studio'
import { Glyph, HwText } from './HardwareRow'
import { ICON_BASE, ICON_OFF, ICON_ON } from './hardwareRowStyles'

const PUMP_COPY: Record<PumpFlow, string> = {
  gentle: 'Gentle cascade into the pool',
  strong: 'Strong flow; frogs and shrimp dislike it',
  off: 'Still water; it goes stale',
}
const FLOWS: { flow: PumpFlow; label: string }[] = [
  { flow: 'off', label: 'Off' },
  { flow: 'gentle', label: 'Gentle' },
  { flow: 'strong', label: 'Strong' },
]

/** The waterfall pump row with its Off / Gentle / Strong switch; disabled when there is no pool. */
export function PumpFlowControl() {
  const pumpFlow = useAtomValue(pumpFlowAtom)
  const waterSplit = useAtomValue(waterSplitAtom)
  const setPumpFlow = useSetAtom(pumpFlowAtom)
  const phone = useAtomValue(layoutModeAtom) === 'phone'
  const pool = hasPool(waterSplit)
  const pumpSub = pool ? PUMP_COPY[pumpFlow] : 'No pool in this build'

  return (
    <>
      <div className="mt-0.5 flex w-full items-center gap-2.5 px-2.5 pt-[9px] pb-1.5">
        <span className={cn(ICON_BASE, pool && pumpFlow !== 'off' ? ICON_ON : ICON_OFF)}>
          <Glyph d="M12 3v4M8 7h8l-1 6H9zM12 13v3M6 21c2-3 10-3 12 0" />
        </span>
        <HwText label="Waterfall pump" sub={pumpSub} />
      </div>
      <ToggleGroup
        type="single"
        variant="raised"
        size="sm"
        spacing={0.5}
        aria-label="Waterfall pump"
        value={pumpFlow}
        disabled={!pool}
        onValueChange={(flow) => flow && setPumpFlow(flow as PumpFlow)}
        className="mr-2.5 mb-2 ml-[50px] grid w-auto grid-cols-3 rounded-[9px] bg-sand-pale p-0.5"
      >
        {FLOWS.map(({ flow, label }) => (
          <ToggleGroupItem
            key={flow}
            value={flow}
            className={cn(
              'h-[26px] rounded-[7px] text-[11.5px] hover:bg-transparent hover:text-forest-ink data-[state=on]:font-semibold data-[state=on]:text-forest-ink data-[state=on]:shadow-none disabled:opacity-60',
              flow === 'strong' &&
                'data-[state=on]:text-[#9a3412] data-[state=on]:hover:text-[#9a3412]',
              phone && 'h-9',
            )}
          >
            {label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </>
  )
}
