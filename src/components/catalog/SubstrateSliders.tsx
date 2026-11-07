import { Fragment } from 'react'
import { LAND_LAYER_IDS, SUBSTRATES_BY_ID } from '@/data/substrates'
import { mutateWorld } from '@/engine/engineBridge'
import { getTotalSubstrateDepth, hasPool } from '@/engine/geometry'
import { selectSubstrates, selectWaterSplit } from '@/store/selectors'
import { showToast } from '@/store/toastStore'
import { useStudioStore } from '@/store/useStudioStore'

type SliderLayerId = (typeof LAND_LAYER_IDS)[number] | 'rivergravel' | 'water'

const LAND_TOP_DOWN = [...LAND_LAYER_IDS].reverse()
const POOL_LAYERS: { id: SliderLayerId; max: number }[] = [
  { id: 'rivergravel', max: 30 },
  { id: 'water', max: 80 },
]
const SUBHEAD = 'text-[11px] font-semibold text-[#3f4a42]'
const NEW_POOL_TOAST = 'New pool: it cycles for about 3 weeks before fish and shrimp are safe'

/** Total readout shown in the section header (prototype #total-substrate-depth). */
export function TotalSubstrateDepth() {
  const substrates = useStudioStore(selectSubstrates)
  return (
    <span
      data-testid="total-substrate-depth"
      className="tabular-nums text-[11px] font-semibold text-forest-mid"
    >
      {Math.round(getTotalSubstrateDepth(substrates))} mm of land
    </span>
  )
}

function splitLabel(waterSplit: number): string {
  if (!hasPool(waterSplit)) return 'All land'
  const w = Math.round(waterSplit * 100)
  return `${100 - w}% land / ${w}% water`
}

function SliderRow({ id, max }: { id: SliderLayerId; max: number }) {
  const layer = SUBSTRATES_BY_ID[id]
  const val = Math.round(useStudioStore((s) => s.substrates[id]) || 0)
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="inline-flex items-center gap-1.5 font-medium text-ink-soft">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: layer.color }}
          />
          <span>{layer.name}</span>
        </span>
        <span className="tabular-nums text-[11px] text-stone">{val} mm</span>
      </div>
      <input
        type="range"
        min={0}
        max={max}
        step={1}
        value={val}
        aria-label={layer.name}
        onChange={(e) => changeLayer(id, parseInt(e.target.value, 10))}
        className="w-full"
      />
    </div>
  )
}

function resetCycle() {
  useStudioStore.getState().setCycleProgress(0)
  mutateWorld((w) => {
    w.env.cycleProgress = 0
  })
}

/** Writes a layer depth; first water into an existing pool restarts the cycle (prototype 2198–2201). */
function changeLayer(id: SliderLayerId, mm: number) {
  const { substrates, waterSplit, setSubstrate } = useStudioStore.getState()
  const before = substrates[id] || 0
  setSubstrate(id, mm)
  if (id === 'water' && before < 1 && mm >= 1 && hasPool(waterSplit)) resetCycle()
}

/** Changing the pool width; opening a new pool restarts the nitrogen cycle (prototype 2189–2196). */
function changePoolWidth(percent: number) {
  const { waterSplit: prev, setWaterSplit, setSubstrate } = useStudioStore.getState()
  setWaterSplit(percent / 100)
  const next = useStudioStore.getState().waterSplit
  if (!hasPool(prev) && hasPool(next)) {
    resetCycle()
    setSubstrate('water', Math.max(useStudioStore.getState().substrates.water || 0, 40))
    showToast(NEW_POOL_TOAST)
  }
}

export function SubstrateSliders() {
  const waterSplit = useStudioStore(selectWaterSplit)
  return (
    <div className="space-y-2.5 rounded-2xl border border-card-line bg-white p-3">
      <div className={SUBHEAD}>Land, top to bottom</div>
      {LAND_TOP_DOWN.map((id) => (
        <Fragment key={id}>
          <SliderRow id={id} max={60} />
          {id === 'charcoal' && (
            <div className="flex items-center gap-1.5 pl-4 text-[10px] text-[#5b665e]">
              <span className="inline-block w-5 border-t border-dashed border-[#2b332e]" />
              Mesh barrier keeps soil out of the drainage
            </div>
          )}
        </Fragment>
      ))}
      <div className={`${SUBHEAD} pt-2`}>Pool</div>
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-ink-soft">Pool width</span>
          <span className="tabular-nums text-[11px] text-stone">{splitLabel(waterSplit)}</span>
        </div>
        <input
          type="range"
          min={0}
          max={60}
          step={1}
          value={Math.round((waterSplit || 0) * 100)}
          aria-label="Pool width"
          onChange={(e) => changePoolWidth(parseInt(e.target.value, 10))}
          className="w-full"
        />
        <div className="text-[10px] text-[#5b665e]">
          Crab builds run about 70/30; fish builds give the pool more room.
        </div>
      </div>
      {POOL_LAYERS.map(({ id, max }) => (
        <SliderRow key={id} id={id} max={max} />
      ))}
    </div>
  )
}
