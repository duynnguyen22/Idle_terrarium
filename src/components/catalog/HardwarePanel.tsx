import { useId, type ReactNode } from 'react'
import { useShallow } from 'zustand/react/shallow'
import type { PumpFlow } from '@/data/types'
import { hasPool } from '@/engine/geometry'
import { isLampOn } from '@/engine/simulation/clock'
import { useStudioStore } from '@/store/useStudioStore'

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
  'inline-flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg transition-colors'
const ICON_OFF = 'bg-[#eef1ea] text-[#8a948c]'
const ICON_ON = 'bg-[#dcebe0] text-[#1b5e3b]'
const ICON_LIT = 'bg-[#fbf0cc] text-[#9a6a00]'

function Glyph({ d }: { d: string }) {
  return (
    <svg
      className="h-[17px] w-[17px]"
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
      <span className="text-[12.5px] font-semibold text-[#163022]">{label}</span>
      <span id={subId} className="text-[11px] leading-snug text-[#5b665e]">
        {sub}
      </span>
    </span>
  )
}

function SwitchRow({
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
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-describedby={subId}
      onClick={onToggle}
      className="flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-[9px] text-left transition-colors hover:bg-[#f1f4ef]"
    >
      <span className={`${ICON_BASE} ${iconClass}`}>{icon}</span>
      <HwText label={label} sub={sub} subId={subId} />
      <span
        aria-hidden="true"
        className={`relative h-5 w-[34px] shrink-0 rounded-full transition-colors ${checked ? 'bg-[#1b3b2b]' : 'bg-[#cfd5cb]'}`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-[14px]' : ''}`}
        />
      </span>
    </button>
  )
}

/** Grow lamp, fogger and waterfall pump (prototype `syncHardwareButtons`). */
export function HardwarePanel() {
  const { hasGrowLamp, hasFogger, lighting, autoLightSync, pumpFlow, waterSplit } = useStudioStore(
    useShallow((s) => ({
      hasGrowLamp: s.hasGrowLamp,
      hasFogger: s.hasFogger,
      lighting: s.lighting,
      autoLightSync: s.autoLightSync,
      pumpFlow: s.pumpFlow,
      waterSplit: s.waterSplit,
    })),
  )
  const setHardware = useStudioStore((s) => s.setHardware)
  const setPumpFlow = useStudioStore((s) => s.setPumpFlow)

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
      className="mt-2.5 rounded-[14px] border border-[#e1e5dc] bg-white p-1"
    >
      <SwitchRow
        label="Halo LED Lamp"
        sub={lampSub}
        checked={hasGrowLamp}
        iconClass={!hasGrowLamp ? ICON_OFF : lampOn ? ICON_LIT : ICON_ON}
        icon={
          <Glyph d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" />
        }
        onToggle={() => setHardware('hasGrowLamp', !hasGrowLamp)}
      />
      <SwitchRow
        label="Mist Fogger"
        sub={hasFogger ? 'Running, about +7% humidity' : 'Off; air relies on the pool'}
        checked={hasFogger}
        iconClass={hasFogger ? ICON_ON : ICON_OFF}
        icon={
          <Glyph d="M7 15a4 4 0 0 1 .5-8A5.5 5.5 0 0 1 18 8a3.5 3.5 0 0 1-.5 7zM4 19h16M7 22h10" />
        }
        onToggle={() => setHardware('hasFogger', !hasFogger)}
      />
      <div className="mt-0.5 flex w-full items-center gap-2.5 px-2.5 pb-1.5 pt-[9px]">
        <span className={`${ICON_BASE} ${pool && pumpFlow !== 'off' ? ICON_ON : ICON_OFF}`}>
          <Glyph d="M12 3v4M8 7h8l-1 6H9zM12 13v3M6 21c2-3 10-3 12 0" />
        </span>
        <HwText label="Waterfall pump" sub={pumpSub} />
      </div>
      <div
        role="radiogroup"
        aria-label="Waterfall pump"
        className="mb-2 ml-[50px] mr-2.5 grid grid-cols-3 gap-0.5 rounded-[9px] bg-[#e7eae3] p-0.5"
      >
        {FLOWS.map(({ flow, label }) => {
          const checked = pumpFlow === flow
          return (
            <button
              key={flow}
              type="button"
              role="radio"
              aria-checked={checked}
              disabled={!pool}
              onClick={() => setPumpFlow(flow)}
              className={`h-[26px] rounded-[7px] text-[11.5px] transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                checked
                  ? `bg-white font-semibold ${flow === 'strong' ? 'text-[#9a3412]' : 'text-[#163022]'}`
                  : 'font-medium text-[#4f5a52] hover:text-[#163022]'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
