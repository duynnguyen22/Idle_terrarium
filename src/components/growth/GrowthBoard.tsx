import { PACE_SUBTITLES, type PaceId } from '@/data/pace'
import { useAtomValue, useSetAtom } from 'jotai'
import { cn } from 'cn'
import { useId } from 'react'
import { SheetGrab } from '@/components/layout/phone/SheetGrab'
import { sheetClasses } from '@/components/layout/phone/sheetClasses'
import { tryGetWorld } from '@/engine/engineBridge'
import { PING_MS, pingItem } from '@/engine/marks'
import { focusOn } from '@/engine/view'
import { breedConditions } from '@/engine/simulation/breed'
import { lightDose } from '@/engine/simulation/life'
import { appStore } from '@/store/appStore'
import { layoutModeAtom, sheetDragPxAtom } from '@/store/layout'
import { growthBoardOpenAtom } from '@/store/overlay'
import {
  dayCountAtom,
  hasGrowLampAtom,
  lampColorAtom,
  paceAtom,
  pumpFlowAtom,
  selectedIdAtom,
  substratesAtom,
  timeSpeedAtom,
  waterSplitAtom,
} from '@/store/studio'
import { showToast } from '@/store/toast'
import { faunaRows, floraRow, tankStats, upNext, type FaunaRow, type FloraRow } from './growthRows'
import { GrowthAnimalsSection } from './GrowthAnimalsSection'
import { GrowthBoardHeader } from './GrowthBoardHeader'
import { GrowthPaceToggle } from './GrowthPaceToggle'
import { GrowthPlantsSection } from './GrowthPlantsSection'
import { GrowthTankStats, GrowthUpNext } from './GrowthSummary'
import { useGrowthBoardLifecycle } from './useGrowthBoardLifecycle'

/** A click's close-up: the camera eases to the animals for 3.2 s, then returns. */
function closeUp(uids: string[]): void {
  const world = tryGetWorld()
  if (world) focusOn(world.view, uids, 2, 3200, performance.now())
}

/** The Growth board: every plant and animal with its life phase, health and what is coming next. */
export function GrowthBoard() {
  const titleId = useId()
  const open = useAtomValue(growthBoardOpenAtom)
  const setOpen = useSetAtom(growthBoardOpenAtom)
  const closeGrowthBoard = () => setOpen(false)
  const pace = useAtomValue(paceAtom)
  const timeSpeed = useAtomValue(timeSpeedAtom)
  const dayCount = useAtomValue(dayCountAtom)
  const pumpFlow = useAtomValue(pumpFlowAtom)
  const waterSplit = useAtomValue(waterSplitAtom)
  const hasGrowLamp = useAtomValue(hasGrowLampAtom)
  const lampColor = useAtomValue(lampColorAtom)
  const substrates = useAtomValue(substratesAtom)
  const setPace = useSetAtom(paceAtom)
  const mode = useAtomValue(layoutModeAtom)
  const dragging = useAtomValue(sheetDragPxAtom) !== null
  const sheet = sheetClasses(mode, true, dragging)
  useGrowthBoardLifecycle(open, setOpen)

  if (!open) return null

  const world = tryGetWorld()
  const dose = lightDose({ hasGrowLamp, lampColor })
  const plants: FloraRow[] = world
    ? world.items.filter((i) => i.category === 'flora').map((i) => floraRow(i, dose, pace))
    : []
  const animals: FaunaRow[] = world
    ? faunaRows(world, breedConditions(world, { substrates, waterSplit }), pace)
    : []
  const stats = world ? tankStats(world, { dayCount, pumpFlow, waterSplit, pace }) : null
  const next = upNext([...plants, ...animals])
  const watching =
    timeSpeed === 0
      ? 'Paused while you watch.'
      : timeSpeed === 5
        ? 'Running 5× while you watch.'
        : 'Growth continues while the app is closed.'

  const ping = (uids: string[]) => {
    const live = tryGetWorld()
    if (live) for (const uid of uids) pingItem(live, uid, PING_MS)
  }
  const select = (uids: string[]) => {
    const first = uids[0]
    if (first === undefined) return
    appStore.set(selectedIdAtom, first)
    closeUp(uids.slice(0, 3))
  }
  const choosePace = (id: PaceId) => {
    setPace(id)
    showToast(`Tank pace: ${PACE_SUBTITLES[id]}`)
  }

  return (
    <aside
      id="growth-board"
      role="dialog"
      aria-labelledby={titleId}
      data-dragging={dragging || undefined}
      className={cn(
        sheet
          ? [sheet, 'flex flex-col gap-2.5 px-4 pt-4', mode === 'phone' && 'pt-0']
          : 'absolute inset-y-0 right-0 z-30 flex w-[min(26.25rem,100%)] flex-col gap-2.5 border-l border-sand-border bg-paper px-4 pt-4 shadow-[-18px_0_40px_-24px_rgba(20,40,28,.45)]',
      )}
    >
      {mode === 'phone' && <SheetGrab />}
      <GrowthBoardHeader titleId={titleId} onClose={closeGrowthBoard} />

      <GrowthPaceToggle pace={pace} onChoose={choosePace} />
      <p className="-mt-1 mx-0.5 text-[11.5px] text-stone">{`${PACE_SUBTITLES[pace]}. ${watching}`}</p>

      {stats && <GrowthTankStats stats={stats} />}

      <GrowthUpNext next={next} />

      <div className="-mx-4 flex-1 overflow-y-auto px-4 pb-4">
        <GrowthPlantsSection plants={plants} ping={ping} select={select} />

        <GrowthAnimalsSection animals={animals} ping={ping} select={select} />

        <p className="mx-0.5 mt-3 text-[11px] leading-snug text-[#7a857c]">
          Times are estimates at 1× speed and assume conditions stay the same. Struggling plants
          slow down; resting ones pause until you care for them.
        </p>
      </div>
    </aside>
  )
}
