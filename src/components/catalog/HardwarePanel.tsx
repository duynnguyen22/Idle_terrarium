import { useId, type ReactNode } from 'react'
import { useAtomValue, useSetAtom } from 'jotai'
import { cn } from 'cn'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { PumpFlow } from '@/data/types'
import { hasPool } from '@/engine/geometry'
import { isLampOn } from '@/engine/simulation/clock'
import {
  autoLightSyncAtom,
  hasFoggerAtom,
  hasGrowLampAtom,
  lightingAtom,
  pumpFlowAtom,
  waterSplitAtom,
} from '@/store/studio'

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

const ICON_BASE =
  'inline-flex size-[30px] shrink-0 items-center justify-center rounded-lg transition-colors'
export const ICON_OFF = 'bg-linen text-[#8a948c]'
export const ICON_ON = 'bg-[#dcebe0] text-[#1b5e3b]'
const ICON_LIT = 'bg-[#fbf0cc] text-[#9a6a00]'

export function Glyph({ d }: { d: string }) {
  return (
    <svg
      className="size-[17px]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  )
}

function HwText({ label, sub, subId }: { label: string; sub: string; subId?: string }) {
  return (
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="text-[12.5px] font-semibold text-forest-ink">{label}</span>
      <span id={subId} className="text-[11px] leading-snug text-stone">
        {sub}
      </span>
    </span>
  )
}

/** A hardware row: the whole row is the click target for its shadcn Switch. */
export function SwitchRow({
  label,
  sub,
  checked,
  iconClass,
  icon,
  onToggle,
}: {
  label: string
  sub: string
  checked: boolean
  iconClass: string
  icon: ReactNode
  onToggle: () => void
}) {
  const subId = useId()
  return (
    <label className="flex w-full cursor-pointer items-center gap-2.5 rounded-[10px] px-2.5 py-[9px] transition-colors hover:bg-[#f1f4ef]">
      <span className={cn(ICON_BASE, iconClass)}>{icon}</span>
      <HwText label={label} sub={sub} subId={subId} />
      <Switch
        checked={checked}
        aria-label={label}
        aria-describedby={subId}
        onCheckedChange={onToggle}
      />
    </label>
  )
}

/** Grow lamp, fogger and waterfall pump (prototype `syncHardwareButtons`). */
export function HardwarePanel() {
  const hasGrowLamp = useAtomValue(hasGrowLampAtom)
  const hasFogger = useAtomValue(hasFoggerAtom)
  const lighting = useAtomValue(lightingAtom)
  const autoLightSync = useAtomValue(autoLightSyncAtom)
  const pumpFlow = useAtomValue(pumpFlowAtom)
  const waterSplit = useAtomValue(waterSplitAtom)
  const setHasGrowLamp = useSetAtom(hasGrowLampAtom)
  const setHasFogger = useSetAtom(hasFoggerAtom)
  const setPumpFlow = useSetAtom(pumpFlowAtom)

  const lampOn = isLampOn({ hasGrowLamp, lighting })
  const lampSub = !hasGrowLamp
    ? 'Switched off; plants get room light only'
    : lampOn
      ? autoLightSync
        ? 'Lit until 20:00'
        : 'Lit'
      : autoLightSync
        ? 'Resting tonight, back on at 05:30'
        : 'Resting for the night'
  const pool = hasPool(waterSplit)
  const pumpSub = pool ? PUMP_COPY[pumpFlow] : 'No pool in this build'

  return (
    <div
      role="group"
      aria-label="Enclosure hardware"
      className="mt-2.5 rounded-[14px] border border-card-line bg-white p-1"
    >
      <SwitchRow
        label="Grow lamp"
        sub={lampSub}
        checked={hasGrowLamp}
        iconClass={!hasGrowLamp ? ICON_OFF : lampOn ? ICON_LIT : ICON_ON}
        icon={
          <Glyph d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" />
        }
        onToggle={() => setHasGrowLamp(!hasGrowLamp)}
      />
      <SwitchRow
        label="Mist fogger"
        sub={hasFogger ? 'Running, about +7% humidity' : 'Off; air relies on the pool'}
        checked={hasFogger}
        iconClass={hasFogger ? ICON_ON : ICON_OFF}
        icon={
          <Glyph d="M7 15a4 4 0 0 1 .5-8A5.5 5.5 0 0 1 18 8a3.5 3.5 0 0 1-.5 7zM4 19h16M7 22h10" />
        }
        onToggle={() => setHasFogger(!hasFogger)}
      />
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
            )}
          >
            {label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}
