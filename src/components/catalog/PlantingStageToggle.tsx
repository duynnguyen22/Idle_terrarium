import { RadioGroup } from 'radix-ui'
import { StageIcon } from '@/components/ui/StudioIcons'
import type { GrowthStage } from '@/data/types'
import { mutateWorld } from '@/engine/engineBridge'
import { setFloraStage } from '@/engine/items'
import { selectPlantingStage } from '@/store/selectors'
import { showToast } from '@/store/toastStore'
import { useStudioStore } from '@/store/useStudioStore'

type ToggleStage = Extract<GrowthStage, 'sprout' | 'mature'>

const OPTIONS: { stage: ToggleStage; label: string; hint: string; toast: string }[] = [
  {
    stage: 'sprout',
    label: 'Sprout',
    hint: '62% size, grows in',
    toast: 'Planting Stage: Sprout (new plants start as young shoots)',
  },
  {
    stage: 'mature',
    label: 'Mature',
    hint: 'Full size now',
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
    <div className="stage-card">
      <div className="mb-2 text-xs font-semibold text-[#163022]">Plant as</div>
      <RadioGroup.Root
        className="stage-seg"
        aria-label="Planting stage"
        orientation="horizontal"
        value={isSprout ? 'sprout' : 'mature'}
      >
        {OPTIONS.map((o) => (
          <RadioGroup.Item
            key={o.stage}
            value={o.stage}
            onClick={() => choose(o.stage, o.toast)}
            className="stage-opt"
          >
            <StageIcon stage={o.stage} />
            <span className="stage-txt">
              <b>{o.label}</b>
              <small>{o.hint}</small>
            </span>
          </RadioGroup.Item>
        ))}
      </RadioGroup.Root>
      <div className="mt-2 text-[11px] leading-snug text-[#4a6b56]">
        {isSprout
          ? 'Places seedlings at 62% size. They grow into mature plants over a few in-game days.'
          : 'Places full-sized, established plants.'}
      </div>
    </div>
  )
}
