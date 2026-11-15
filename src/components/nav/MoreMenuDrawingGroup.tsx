import { useAtomValue } from 'jotai'
import {
  DropdownMenuCheckboxItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { appStore } from '@/store/appStore'
import { showToast } from '@/store/toast'
import { perfHudAtom, smoothDrawingAtom } from '@/store/view'
import { ITEM } from './moreMenuActions'

/** The "Drawing" group of the more menu: smooth drawing and the frame-rate readout. */
export function MoreMenuDrawingGroup() {
  const smoothDrawing = useAtomValue(smoothDrawingAtom)
  const perfHud = useAtomValue(perfHudAtom)

  const toggleSmooth = () => {
    const next = !smoothDrawing
    appStore.set(smoothDrawingAtom, next)
    showToast(next ? 'Smooth drawing on' : 'Smooth drawing off: full detail every frame')
  }

  return (
    <DropdownMenuGroup aria-labelledby="drawing-label">
      <DropdownMenuLabel
        id="drawing-label"
        className="px-3 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase"
      >
        Drawing
      </DropdownMenuLabel>
      <DropdownMenuCheckboxItem
        checked={smoothDrawing}
        onCheckedChange={toggleSmooth}
        onSelect={(e) => e.preventDefault()}
        className={`${ITEM} pr-8`}
      >
        Smooth drawing
      </DropdownMenuCheckboxItem>
      <DropdownMenuCheckboxItem
        checked={perfHud}
        onCheckedChange={() => appStore.set(perfHudAtom, !perfHud)}
        onSelect={(e) => e.preventDefault()}
        className={`${ITEM} pr-8`}
      >
        Show frame rate
      </DropdownMenuCheckboxItem>
    </DropdownMenuGroup>
  )
}
