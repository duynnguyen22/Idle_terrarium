import { SUBSTRATE_LAYERS, type SubstrateId } from '@/data/substrates'
import { getTotalSubstrateDepth } from '@/engine/geometry'
import { selectSubstrates } from '@/store/selectors'
import { useStudioStore } from '@/store/useStudioStore'

const SLIDER_LAYERS = SUBSTRATE_LAYERS.filter((l) => l.id !== 'siphon')

/** Total readout shown in the section header (prototype #total-substrate-depth). */
export function TotalSubstrateDepth() {
  const substrates = useStudioStore(selectSubstrates)
  return (
    <span
      data-testid="total-substrate-depth"
      className="font-mono text-[11px] font-semibold text-forest-mid"
    >
      {Math.round(getTotalSubstrateDepth(substrates))} mm
    </span>
  )
}

export function SubstrateSliders() {
  const substrates = useStudioStore(selectSubstrates)
  const setSubstrate = useStudioStore((s) => s.setSubstrate)
  return (
    <div className="space-y-2.5 rounded-2xl border border-sand-border bg-white p-3">
      {SLIDER_LAYERS.map((layer) => {
        const val = Math.round(substrates[layer.id as Exclude<SubstrateId, 'siphon'>] || 0)
        return (
          <div key={layer.id} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 font-medium text-ink-soft">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: layer.color }}
                />
                <span>{layer.name}</span>
              </span>
              <span className="font-mono text-[11px] text-stone">{val} mm</span>
            </div>
            <input
              type="range"
              min={0}
              max={45}
              step={1}
              value={val}
              aria-label={layer.name}
              onChange={(e) =>
                setSubstrate(
                  layer.id as Exclude<SubstrateId, 'siphon'>,
                  parseInt(e.target.value, 10),
                )
              }
              className="w-full"
            />
          </div>
        )
      })}
    </div>
  )
}
