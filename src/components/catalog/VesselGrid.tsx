import { VESSELS } from '@/data/vessels'
import { getVesselPreviewSVG } from '@/lib/vesselPreview'
import { selectVessel } from '@/store/selectors'
import { useStudioStore } from '@/store/useStudioStore'

export function VesselGrid() {
  const vessel = useStudioStore(selectVessel)
  const setVessel = useStudioStore((s) => s.setVessel)
  return (
    <div className="grid grid-cols-2 gap-2">
      {VESSELS.map((v) => {
        const active = v.id === vessel
        return (
          <button
            key={v.id}
            type="button"
            aria-pressed={active}
            onClick={() => setVessel(v.id)}
            className={`flex items-center gap-2.5 rounded-2xl border p-2.5 text-left transition ${
              active
                ? 'border-forest-deep bg-forest-deep text-white shadow-sm'
                : 'border-sand-border bg-white text-ink-deep hover:bg-linen'
            }`}
          >
            <span dangerouslySetInnerHTML={{ __html: getVesselPreviewSVG(v.id, active) }} />
            <span className="min-w-0">
              <span className="block truncate text-xs font-bold">{v.name}</span>
              <span
                className={`block truncate text-[10px] ${active ? 'text-emerald-100' : 'text-stone-light'}`}
              >
                {v.desc}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
