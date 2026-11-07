import { LineIcon } from '@/components/ui/LineIcon'
import type { GrowthStage } from '@/data/types'
import { mutateWorld } from '@/engine/engineBridge'
import { setFloraStage } from '@/engine/items'
import { selectPlantingStage } from '@/store/selectors'
import { showToast } from '@/store/toastStore'
import { useStudioStore } from '@/store/useStudioStore'

type ToggleStage = Extract<GrowthStage, 'sprout' | 'mature'>

const OPTIONS: { stage: ToggleStage; label: string; toast: string }[] = [
  {
    stage: 'sprout',
    label: 'Sprout',
    toast: 'Planting Stage: Sprout (new plants start as young shoots)',
  },
  {
    stage: 'mature',
    label: 'Mature',
    toast: 'Planting Stage: Mature (new plants placed at full size)',
  },
]

export function PlantingStageToggle() {
  const stage = useStudioStore(selectPlantingStage)
  const isSprout = stage === 'sprout'

  const choose = (next: ToggleStage, toast: string) => {
    const { setPlantingStage, selectedId, selectItem } = useStudioStore.getState()
    setPlantingStage(next)
    // A selected flora specimen is converted immediately (prototype 2896-2920).
    if (selectedId) {
      mutateWorld((w) => setFloraStage(w, selectedId, next))
      selectItem(selectedId)
    }
    showToast(toast)
  }

  return (
    <div className="space-y-1.5 rounded-xl border border-sand-border bg-white p-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-forest-deep">Planting Stage:</span>
        <div className="inline-flex rounded-lg border border-sand-border bg-sand-light p-0.5">
          {OPTIONS.map((o) => {
            const active = (o.stage === 'sprout') === isSprout
            return (
              <button
                key={o.stage}
                type="button"
                aria-pressed={active}
                onClick={() => choose(o.stage, o.toast)}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                  active
                    ? 'bg-white text-forest-deep shadow-2xs'
                    : 'text-ink hover:text-forest-deep'
                }`}
              >
                <LineIcon name="sprout" className="h-3.5 w-3.5" />
                {o.label}
              </button>
            )
          })}
        </div>
      </div>
      <div className="rounded-lg bg-mint-mist px-2 py-1 text-[10px] font-medium text-forest-grey">
        {isSprout
          ? 'Places young starter sprouts (62% scale) that gradually grow into mature plants.'
          : 'Places full-sized, established botanical specimens (100% scale).'}
      </div>
    </div>
  )
}
