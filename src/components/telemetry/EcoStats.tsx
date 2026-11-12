import { useAtomValue } from 'jotai'
import { CYCLE_DAYS, cycleChemistry, cycleDay } from '@/engine/care'
import { mutateWorld } from '@/engine/engineBridge'
import { hasPool } from '@/engine/geometry'
import { addSporePatch } from '@/engine/simulation/mold'
import { appStore } from '@/store/appStore'
import { cycleProgressAtom, pumpFlowAtom, studioStateAtom, waterSplitAtom } from '@/store/studio'
import { telemetryAtom } from '@/store/telemetry'
import { showToast } from '@/store/toast'
import type { PumpFlow } from '@/data/types'

function glassText(c: number): string {
  if (c < 0.18) return 'Clear'
  if (c < 0.55) return 'Light fog, clears on its own'
  if (c < 0.82) return 'Heavy fog'
  return 'Fogged over by condensation'
}

function waterCycleText(pool: boolean, p: number, pumpFlow: PumpFlow): string {
  if (!pool) return 'No pool in this build'
  if (p >= 1) return `Cycled · ammonia 0 ppm · pump ${pumpFlow}`
  const { nh3, no2 } = cycleChemistry(p)
  return `Cycling, day ${cycleDay(p)} of ~${CYCLE_DAYS} · NH₃ ${nh3.toFixed(1)} · NO₂ ${no2.toFixed(1)} ppm`
}

/** Glass, pool water cycle, mold and cleanup crew readouts (prototype stat-* rows). */
export function EcoStats() {
  const { condensation, moldCount, cleanupCrewCount } = useAtomValue(telemetryAtom)
  const pool = hasPool(useAtomValue(waterSplitAtom))
  const cycleProgress = useAtomValue(cycleProgressAtom)
  const pumpFlow = useAtomValue(pumpFlowAtom)

  const spawnSpore = () => {
    mutateWorld((w) => addSporePatch(w, appStore.get(studioStateAtom)))
    showToast('Mold spore added. Scrub it, or let the isopods clean it up')
  }

  return (
    <div className="space-y-2.5 rounded-2xl border border-card-line bg-white p-3.5 text-xs">
      <div className="flex items-start justify-between gap-3">
        <span className="shrink-0 text-stone">Glass</span>
        <span className="text-right font-semibold text-forest-ink">{glassText(condensation)}</span>
      </div>
      <div>
        <div className="flex items-start justify-between gap-3">
          <span className="shrink-0 text-stone">Pool water</span>
          <span className="text-right font-semibold text-[#0b5a7a]">
            {waterCycleText(pool, cycleProgress, pumpFlow)}
          </span>
        </div>
        {pool && (
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sand-light">
            <div
              data-testid="cycle-bar"
              className="h-full rounded-full bg-[#0e7490]"
              style={{ width: `${Math.round(Math.min(1, cycleProgress) * 100)}%` }}
            />
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-stone">Mold</span>
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-forest-ink">
            {moldCount ? `${moldCount} patch${moldCount > 1 ? 'es' : ''}` : 'None'}
          </span>
          <button
            type="button"
            onClick={spawnSpore}
            title="Add a mold spore to watch the cleanup crew work"
            className="rounded bg-wheat px-1.5 py-0.5 text-[11px] font-semibold text-wheat-ink transition hover:bg-wheat-hover"
          >
            + Spore
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-stone">Cleanup crew</span>
        <span className="font-semibold text-forest-ink">
          {cleanupCrewCount ? `${cleanupCrewCount} at work` : 'None yet'}
        </span>
      </div>
    </div>
  )
}
