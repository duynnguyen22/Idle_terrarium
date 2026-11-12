import { useAtomValue } from 'jotai'
import { DropdownMenu } from 'radix-ui'
import { AccountChip } from '@/components/account/AccountChip'
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

const NEUTRAL =
  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sand-pale text-ink-soft transition hover:bg-sand-track'
const MENU_ITEM =
  'inline-flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium'

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
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger aria-label="More actions" title="More actions" className={NEUTRAL}>
        <LineIcon name="more" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          // Escape closes the menu only, not relax mode or the selection (global handler on window).
          onEscapeKeyDown={(e) => e.stopPropagation()}
          className="z-50 w-60 rounded-xl border border-sand-border bg-white p-1 shadow-lg"
        >
          <DropdownMenu.Item
            onSelect={rebuildFalls}
            className={`${MENU_ITEM} text-ink-deep hover:bg-linen`}
          >
            <LineIcon name="dice" />
            Rebuild the Falls Lake paludarium
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={clearAll}
            className={`${MENU_ITEM} text-rose-700 hover:bg-rose-50`}
          >
            <LineIcon name="trash" />
            Clear all specimens
          </DropdownMenu.Item>
          <DropdownMenu.Group aria-labelledby="time-away-label">
            <div className="mt-1 border-t border-sand-border px-3 pb-1 pt-2">
              <DropdownMenu.Label
                id="time-away-label"
                className="text-[10px] font-semibold uppercase tracking-wide text-ink-soft"
              >
                Time away
              </DropdownMenu.Label>
            </div>
            <DropdownMenu.Item
              onSelect={showLastSummary}
              className={`${MENU_ITEM} text-ink-deep hover:bg-linen`}
            >
              Show the last summary
            </DropdownMenu.Item>
            <DropdownMenu.Group aria-labelledby="preview-gap-label" className="px-3 py-1">
              <DropdownMenu.Label
                id="preview-gap-label"
                className="mb-1 text-xs font-medium text-ink-deep"
              >
                Preview a gap
              </DropdownMenu.Label>
              <div className="flex gap-1">
                {GAPS.map((g) => (
                  <DropdownMenu.Item
                    key={g.hours}
                    aria-label={`Preview a gap of ${g.label}`}
                    onSelect={() => previewGap(g.hours)}
                    className="flex-1 rounded-lg bg-sand-pale px-1 py-1 text-center text-[11px] font-medium text-ink-soft transition hover:bg-sand-track"
                  >
                    {g.label}
                  </DropdownMenu.Item>
                ))}
              </div>
            </DropdownMenu.Group>
            <DropdownMenu.CheckboxItem
              checked={catchupEnabled}
              onCheckedChange={toggleCatchup}
              // Keep the menu open so the switch visibly flips.
              onSelect={(e) => e.preventDefault()}
              className={`${MENU_ITEM} justify-between text-ink-deep hover:bg-linen`}
            >
              Grow while I&apos;m away
              <span
                aria-hidden="true"
                className={`inline-flex h-4 w-7 shrink-0 items-center rounded-full px-0.5 transition ${catchupEnabled ? 'bg-forest-mid' : 'bg-sand-track'}`}
              >
                <span
                  className={`h-3 w-3 rounded-full bg-white transition ${catchupEnabled ? 'translate-x-3' : ''}`}
                />
              </span>
            </DropdownMenu.CheckboxItem>
          </DropdownMenu.Group>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
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
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={growthOpen}
        aria-controls="growth-board"
        aria-label="Growth"
        title="See how every plant and animal is growing"
        onClick={toggleGrowth}
        className={`inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2 text-xs lg:px-3 font-semibold transition ${
          growthOpen
            ? 'bg-forest-deep text-white'
            : 'bg-sand-pale text-forest-ink hover:bg-sand-track'
        }`}
      >
        <LineIcon name="sprout" />
        <span className="hidden lg:inline">Growth</span>
      </button>
      <button
        type="button"
        onClick={enterRelax}
        title="Full-screen relax mode (R)"
        className="inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-forest-mid px-3 text-xs font-semibold text-white transition hover:bg-forest-deep"
      >
        <LineIcon name="leaf" />
        <span>Relax</span>
      </button>
      <button
        type="button"
        onClick={toggleAudio}
        aria-label="Ambient sound"
        aria-pressed={audioEnabled}
        title="Ambient sound"
        className={NEUTRAL}
      >
        <LineIcon name={audioEnabled ? 'vol' : 'mute'} />
      </button>
      <button
        type="button"
        onClick={() => void takeSnapshot()}
        aria-label="Snapshot"
        title="Save a PNG snapshot of the terrarium"
        className="inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-forest-deep px-3 text-xs font-semibold text-white transition hover:bg-forest-dark"
      >
        <LineIcon name="camera" />
        <span className="hidden lg:inline">Snapshot</span>
      </button>
      <MoreMenu />
    </div>
  )
}
