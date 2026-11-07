import { mutateWorld } from '@/engine/engineBridge'
import { addSporePatch } from '@/engine/simulation/mold'
import { selectTelemetry } from '@/store/selectors'
import { showToast } from '@/store/toastStore'
import { useStudioStore } from '@/store/useStudioStore'

/** Count of ALL fauna items (prototype stat-fauna), not just mold-cleaning crew. */
const selectFaunaCount = (s: { worldSnapshot: { items: { category: string }[] } | null }) =>
  s.worldSnapshot?.items.filter((i) => i.category === 'fauna').length ?? 0

export function MicroEcologyPanel() {
  const telemetry = useStudioStore(selectTelemetry)
  const faunaCount = useStudioStore(selectFaunaCount)

  const spawnSpore = () => {
    mutateWorld((w) => addSporePatch(w, useStudioStore.getState()))
    showToast('🍄 Spawned fungal spore — use Scrub Mold or Isopods to clean!')
  }

  return (
    <div className="space-y-2 rounded-2xl border border-sand-border bg-white p-3.5 text-xs">
      <div className="flex items-center justify-between">
        <span className="text-stone">Fungal Spores</span>
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-forest-deep">{telemetry.moldCount} Active</span>
          <button
            type="button"
            onClick={spawnSpore}
            title="Test cleanup crew by adding a mold spore"
            className="rounded bg-amber-pale px-1.5 py-0.5 text-[10px] font-semibold text-amber-brown transition hover:bg-amber-soft"
          >
            +Spore
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-stone">Cleanup Crew</span>
        <span className="font-semibold text-forest-deep">{faunaCount} Active</span>
      </div>
    </div>
  )
}
