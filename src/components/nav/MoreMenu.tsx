import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LineIcon } from '@/components/ui/LineIcon'
import { MoreMenuDrawingGroup } from './MoreMenuDrawingGroup'
import { MoreMenuTimeAwayGroup } from './MoreMenuTimeAwayGroup'
import { ITEM, clearAll, rebuildFalls } from './moreMenuActions'

/** "⋯" button with the rarely used, destructive actions (prototype #more-menu). */
export function MoreMenu() {
  // Non-modal: the page behind stays usable and a press outside just closes the menu.
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="sand" size="icon" aria-label="More actions" title="More actions">
          <LineIcon name="more" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        // Escape closes the menu only, not relax mode or the selection (global handler on window).
        onEscapeKeyDown={(e) => e.stopPropagation()}
        className="w-60 rounded-xl"
      >
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={rebuildFalls} className={ITEM}>
            <LineIcon name="dice" />
            Rebuild the Falls Lake paludarium
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={clearAll} className={ITEM}>
            <LineIcon name="trash" />
            Clear all specimens
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <MoreMenuDrawingGroup />
        <DropdownMenuSeparator />
        <MoreMenuTimeAwayGroup />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
