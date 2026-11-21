import { useAtomValue, useSetAtom } from 'jotai'
import { cn } from 'cn'
import { TabButton } from '@/components/layout/phone/TabButton'
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
import { layoutModeAtom, openSheetAtom } from '@/store/layout'
import { MoreMenuDrawingGroup } from './MoreMenuDrawingGroup'
import { MoreMenuPhoneGroup } from './MoreMenuPhoneGroup'
import { MoreMenuTimeAwayGroup } from './MoreMenuTimeAwayGroup'
import { ITEM, clearAll, rebuildFalls } from './moreMenuActions'

/** Handheld: every row at least 44 px tall with 14 px text, like the prototype's m-ui menu. */
const HANDHELD = 'rounded-2xl p-1.5 [&_[role^=menuitem]]:min-h-11 [&_[role^=menuitem]]:text-sm'
const SIZE = {
  desktop: '',
  // Clear of the 48 px top bar and 58 px tab bar (prototype .m-ui max-height).
  phone: 'w-[calc(100vw-16px)] max-h-[calc(100dvh-126px)] overflow-y-auto',
  // Landscape: an 8 px margin top and bottom.
  land: 'w-[300px] max-h-[calc(100dvh-16px)] overflow-y-auto',
} as const

/**
 * "⋯" button with the rarely used, destructive actions (prototype #more-menu). On a phone or in
 * landscape it also carries the top-bar controls that no longer fit; `rail` makes the trigger the
 * landscape rail's More tab.
 */
export function MoreMenu({ trigger = 'icon' }: { trigger?: 'icon' | 'rail' }) {
  const mode = useAtomValue(layoutModeAtom)
  const handheld = mode !== 'desktop'
  const rail = trigger === 'rail'
  const openSheet = useSetAtom(openSheetAtom)
  // Non-modal: the page behind stays usable and a press outside just closes the menu.
  return (
    <DropdownMenu
      modal={false}
      // From the landscape rail, the open panel gives way to the menu.
      onOpenChange={(open) => {
        if (open && rail) openSheet(null)
      }}
    >
      <DropdownMenuTrigger asChild>
        {rail ? (
          <TabButton icon="more" label="More" land />
        ) : (
          <Button
            variant="sand"
            size="icon"
            aria-label="More actions"
            title="More actions"
            className={handheld ? 'size-10 rounded-xl' : undefined}
          >
            <LineIcon name="more" />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={rail ? 'right' : undefined}
        align="end"
        sideOffset={8}
        collisionPadding={8}
        // Escape closes the menu only, not relax mode or the selection (global handler on window).
        onEscapeKeyDown={(e) => e.stopPropagation()}
        className={cn('w-60 rounded-xl', handheld && HANDHELD, SIZE[mode])}
      >
        {handheld && (
          <>
            <MoreMenuPhoneGroup />
            <DropdownMenuSeparator />
          </>
        )}
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
