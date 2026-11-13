import { useAtom } from 'jotai'
import { Toggle } from '@/components/ui/toggle'
import { VESSELS_FOR_PICKER } from '@/data/vessels'
import { getVesselPreviewSVG } from '@/lib/vesselPreview'
import { vesselAtom } from '@/store/studio'

export function VesselGrid() {
  const [vessel, setVessel] = useAtom(vesselAtom)
  return (
    <div className="grid grid-cols-2 gap-2">
      {VESSELS_FOR_PICKER.map((v) => {
        const active = v.id === vessel
        return (
          <Toggle
            key={v.id}
            variant="card"
            size="auto"
            pressed={active}
            onPressedChange={() => setVessel(v.id)}
            className="min-w-0"
          >
            <span dangerouslySetInnerHTML={{ __html: getVesselPreviewSVG(v.id, active) }} />
            <span className="min-w-0">
              <span className="block truncate text-xs font-bold">{v.name}</span>
              <span className="block truncate text-[10px] text-stone-light group-aria-pressed/toggle:text-emerald-100">
                {v.desc}
              </span>
            </span>
          </Toggle>
        )
      })}
    </div>
  )
}
