import { useAtomValue, useSetAtom } from 'jotai'
import { isLampOn } from '@/engine/simulation/clock'
import { autoLightSyncAtom, hasFoggerAtom, hasGrowLampAtom, lightingAtom } from '@/store/studio'
import { Glyph, SwitchRow } from './HardwareRow'
import { ICON_LIT, ICON_OFF, ICON_ON } from './hardwareRowStyles'
import { LampColorControl } from './LampColorControl'
import { PumpFlowControl } from './PumpFlowControl'

/** Grow lamp, fogger and waterfall pump (prototype `syncHardwareButtons`). */
export function HardwarePanel() {
  const hasGrowLamp = useAtomValue(hasGrowLampAtom)
  const hasFogger = useAtomValue(hasFoggerAtom)
  const lighting = useAtomValue(lightingAtom)
  const autoLightSync = useAtomValue(autoLightSyncAtom)
  const setHasGrowLamp = useSetAtom(hasGrowLampAtom)
  const setHasFogger = useSetAtom(hasFoggerAtom)

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
      <LampColorControl />
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
      <PumpFlowControl />
    </div>
  )
}
