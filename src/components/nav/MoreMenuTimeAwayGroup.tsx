import { useAtomValue } from 'jotai'
import {
  DropdownMenuCheckboxItem,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { previewGap } from '@/services/awayFlow'
import { appStore } from '@/store/appStore'
import { catchupEnabledAtom } from '@/store/studio'
import { showToast } from '@/store/toast'
import { GAPS, ITEM, showLastSummary } from './moreMenuActions'

/** The "Time away" group of the more menu: last summary, gap previews and the catch-up switch. */
export function MoreMenuTimeAwayGroup() {
  const catchupEnabled = useAtomValue(catchupEnabledAtom)

  const toggleCatchup = () => {
    const next = !catchupEnabled
    appStore.set(catchupEnabledAtom, next)
    showToast(
      next
        ? 'The tank will keep growing while you are away'
        : 'Growing while away is off. The tank waits for you.',
    )
  }

  return (
    <DropdownMenuGroup aria-labelledby="time-away-label">
      <DropdownMenuLabel
        id="time-away-label"
        className="px-3 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase"
      >
        Time away
      </DropdownMenuLabel>
      <DropdownMenuItem onSelect={showLastSummary} className={ITEM}>
        Show the last summary
      </DropdownMenuItem>
      <DropdownMenuGroup aria-labelledby="preview-gap-label" className="px-3 py-1">
        <DropdownMenuLabel id="preview-gap-label" className="mb-1 p-0 text-xs font-medium">
          Preview a gap
        </DropdownMenuLabel>
        <div className="flex gap-1">
          {GAPS.map((g) => (
            <DropdownMenuItem
              key={g.hours}
              aria-label={`Preview a gap of ${g.label}`}
              onSelect={() => previewGap(g.hours)}
              className="flex-1 justify-center bg-sand-pale px-1 py-1 text-[11px] font-medium"
            >
              {g.label}
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuGroup>
      <DropdownMenuCheckboxItem
        checked={catchupEnabled}
        onCheckedChange={toggleCatchup}
        // Keep the menu open so the check visibly flips.
        onSelect={(e) => e.preventDefault()}
        className={`${ITEM} pr-8`}
      >
        Grow while I&apos;m away
      </DropdownMenuCheckboxItem>
    </DropdownMenuGroup>
  )
}
