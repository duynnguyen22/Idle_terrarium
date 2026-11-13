import { useAtomValue } from 'jotai'
import { StageIcon } from '@/components/ui/StudioIcons'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { GrowthStage } from '@/data/types'
import { mutateWorld } from '@/engine/engineBridge'
import { setFloraStage } from '@/engine/items'
import { appStore } from '@/store/appStore'
import { plantingStageAtom, selectedIdAtom } from '@/store/studio'
import { showToast } from '@/store/toast'

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
  const stage = useAtomValue(plantingStageAtom)
  const isSprout = stage === 'sprout'

  const choose = (next: string) => {
    const option = OPTIONS.find((o) => o.stage === next)
    // Pressing the chosen stage again reports '' — keep the current stage.
    if (!option) return
    appStore.set(plantingStageAtom, option.stage)
    const selectedId = appStore.get(selectedIdAtom)
    // A selected flora specimen is converted immediately (prototype 2896-2920).
    if (selectedId) {
      mutateWorld((w) => setFloraStage(w, selectedId, option.stage))
      appStore.set(selectedIdAtom, selectedId)
    }
    showToast(option.toast)
  }

  return (
    <div className="rounded-[14px] border border-card-line bg-white p-2.5">
      <div className="mb-2 text-xs font-semibold text-forest-ink">Plant as</div>
      <ToggleGroup
        type="single"
        variant="raised"
        size="auto"
        spacing={1}
        aria-label="Planting stage"
        value={isSprout ? 'sprout' : 'mature'}
        onValueChange={choose}
        className="grid w-full grid-cols-2 rounded-[11px] bg-sand-pale p-[3px]"
      >
        {OPTIONS.map((o) => (
          <ToggleGroupItem
            key={o.stage}
            value={o.stage}
            className="stage-opt justify-start gap-[7px] rounded-lg px-1.5 py-[7px] text-left text-stone hover:bg-transparent hover:text-forest-ink data-[state=on]:text-[#1b5e3b] data-[state=on]:shadow-none"
          >
            <StageIcon stage={o.stage} />
            <span className="flex min-w-0 flex-col leading-[1.2]">
              <b className="text-[12.5px] font-semibold text-forest-ink">{o.label}</b>
              <small className="truncate text-[10.5px] font-normal text-stone">{o.hint}</small>
            </span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <div className="mt-2 text-[11px] leading-snug text-forest-grey">
        {isSprout
          ? 'Places seedlings at 62% size. They grow into mature plants over a few in-game days.'
          : 'Places full-sized, established plants.'}
      </div>
    </div>
  )
}
