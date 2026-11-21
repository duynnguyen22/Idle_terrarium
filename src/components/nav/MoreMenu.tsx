import { useAtomValue } from 'jotai'
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
import { layoutModeAtom } from '@/store/layout'
import { MoreMenuDrawingGroup } from './MoreMenuDrawingGroup'
import { MoreMenuPhoneGroup } from './MoreMenuPhoneGroup'
import { MoreMenuTimeAwayGroup } from './MoreMenuTimeAwayGroup'
import { ITEM, clearAll, rebuildFalls } from './moreMenuActions'

/** Handheld: every row at least 44 px tall with 14 px text, like the prototype's m-ui menu. */
const HANDHELD = 'rounded-2xl p-1.5 [&_[role^=menuitem]]:min-h-11 [&_[role^=menuitem]]:text-sm'
const WIDTH = { desktop: '', phone: 'w-[calc(100vw-16px)]', land: 'w-[300px]' } as const

/**
 * "⋯" button with the rarely used, destructive actions (prototype #more-menu). On a phone or in
 * landscape it also carries the top-bar controls that no longer fit; `rail` makes the trigger the
 * landscape rail's More tab.
 */
export function MoreMenu({ trigger = 'icon' }: { trigger?: 'icon' | 'rail' }) {
  const mode = useAtomValue(layoutModeAtom)
  const handheld = mode !== 'desktop'
  const rail = trigger === 'rail'
  // Non-modal: the page behind stays usable and a press outside just closes the menu.
  return (
    <DropdownMenu modal={false}>
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
        // Escape closes the menu only, not relax mode or the selection (global handler on window).
        onEscapeKeyDown={(e) => e.stopPropagation()}
        className={cn('w-60 rounded-xl', handheld && HANDHELD, WIDTH[mode])}
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
