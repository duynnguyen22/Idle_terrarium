import { useAtomValue } from 'jotai'
import { AccountChip } from '@/components/account/AccountChip'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LineIcon } from '@/components/ui/LineIcon'
import { startAudioFromGesture, stopAudio } from '@/hooks/useAudio'
import { mutateWorld } from '@/engine/engineBridge'
import { applyPreset } from '@/engine/presets'
import { exportSnapshotPng, snapshotFilename } from '@/lib/snapshot'
import { getTerrariumCanvas } from '@/lib/terrariumCanvas'
import { previewGap } from '@/store/awayFlow'
import { appStore } from '@/store/appStore'
import { growthBoardOpenAtom, openAwayAtom, openGrowthBoardAtom } from '@/store/overlay'
import {
  audioEnabledAtom,
  awayLogAtom,
  catchupEnabledAtom,
  dayCountAtom,
  relaxModeAtom,
  selectedIdAtom,
} from '@/store/studio'
import { showToast } from '@/store/toast'

const enterRelax = () => {
  appStore.set(relaxModeAtom, true)
  startAudioFromGesture()
}
const toggleAudio = () => {
  // Starting must happen inside this click (gesture); stopping must not create an AudioContext.
  if (appStore.get(audioEnabledAtom)) stopAudio()
  else startAudioFromGesture()
}
const takeSnapshot = async () => {
  const canvas = getTerrariumCanvas()
  if (!canvas) return
  const ok = await exportSnapshotPng(canvas, snapshotFilename(appStore.get(dayCountAtom)))
  if (ok) showToast('Snapshot saved')
}
const rebuildFalls = () => {
  let message = ''
  mutateWorld((w) => {
    message = applyPreset(w, 'falls')
  })
  showToast(message)
}
const clearAll = () => {
  mutateWorld((w) => {
    w.items = []
    // Moss carpet and breeding progress belong to the plants and animals just removed.
    w.mossTufts = []
    w.breed = {}
  })
  appStore.set(selectedIdAtom, null)
  showToast('Cleared all specimens')
}

const showLastSummary = () => {
  if (appStore.get(awayLogAtom).length === 0) {
    showToast('No time away recorded yet. Come back later, or preview a gap below.')
  } else appStore.set(openAwayAtom, 0)
}

const GAPS: { label: string; hours: number }[] = [
  { label: '8 h', hours: 8 },
  { label: '1 day', hours: 24 },
  { label: '3 days', hours: 72 },
  { label: '1 week', hours: 168 },
]

const ITEM = 'px-3 py-2 text-xs font-medium'

/** "⋯" button with the rarely used, destructive actions (prototype #more-menu). */
function MoreMenu() {
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
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function UtilityActions() {
  const audioEnabled = useAtomValue(audioEnabledAtom)
  const growthOpen = useAtomValue(growthBoardOpenAtom)
  const toggleGrowth = () => {
    if (appStore.get(growthBoardOpenAtom)) appStore.set(growthBoardOpenAtom, false)
    else appStore.set(openGrowthBoardAtom)
  }

  return (
    <div className="flex shrink-0 items-center gap-1 lg:gap-1.5">
      <AccountChip />
      <Button
        variant={growthOpen ? 'default' : 'sand'}
        aria-haspopup="dialog"
        aria-expanded={growthOpen}
        aria-controls="growth-board"
        aria-label="Growth"
        title="See how every plant and animal is growing"
        onClick={toggleGrowth}
        className="px-2 text-xs font-semibold lg:px-3"
      >
        <LineIcon name="sprout" />
        <span className="hidden lg:inline">Growth</span>
      </Button>
      <Button
        variant="forest"
        onClick={enterRelax}
        title="Full-screen relax mode (R)"
        className="px-3 text-xs font-semibold"
      >
        <LineIcon name="leaf" />
        <span>Relax</span>
      </Button>
      <Button
        variant="sand"
        size="icon"
        onClick={toggleAudio}
        aria-label="Ambient sound"
        aria-pressed={audioEnabled}
        title="Ambient sound"
      >
        <LineIcon name={audioEnabled ? 'vol' : 'mute'} />
      </Button>
      <Button
        onClick={() => void takeSnapshot()}
        aria-label="Snapshot"
        title="Save a PNG snapshot of the terrarium"
        className="px-3 text-xs font-semibold"
      >
        <LineIcon name="camera" />
        <span className="hidden lg:inline">Snapshot</span>
      </Button>
      <MoreMenu />
    </div>
  )
}
