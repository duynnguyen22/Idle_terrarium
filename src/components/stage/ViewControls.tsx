import { useAtomValue } from 'jotai'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'
import { LineIcon } from '@/components/ui/LineIcon'
import { Toggle } from '@/components/ui/toggle'
import { tryGetWorld } from '@/engine/engineBridge'
import { camHome, zoomAt } from '@/engine/view'
import { frameThePlants } from '@/hooks/useKeyboardShortcuts'
import { appStore } from '@/store/appStore'
import { isHandheldAtom, layoutModeAtom, stagePadPxAtom } from '@/store/layout'
import { relaxModeAtom } from '@/store/studio'
import { showToast } from '@/store/toast'
import { depthOnAtom, zoomPctAtom } from '@/store/view'

/** Each press of + or - multiplies the target zoom by this (prototype vc-in / vc-out). */
const ZOOM_STEP = 1.35

/** Zooms about the canvas centre; does nothing before the canvas has a size. */
function zoomByStep(factor: number): void {
  const view = tryGetWorld()?.view
  if (!view?.size) return
  zoomAt(view, view.size.w / 2, view.size.h / 2, view.camT.z * factor, false)
}

const goHome = () => {
  const world = tryGetWorld()
  if (world) camHome(world.view)
}

const BTN =
  'h-[30px] min-w-[30px] rounded-lg px-1.5 text-[11.5px] font-semibold tabular-nums text-ink-deep transition-[background-color,transform] duration-150 hover:bg-sand-pale active:scale-95 disabled:opacity-35 motion-reduce:transition-none'
/** Touch size: 40 px buttons. The percent button keeps its width in a column. */
const BTN_TOUCH = 'h-10 min-w-10'
const BTN_RELAX = 'text-white/80 hover:bg-white/10 hover:text-white'
// Radix sets both aria-pressed and data-state; both rules have the same specificity, so each on-state
// utility is paired (as in ui/toggle.tsx) and neither can be overridden by the other.
const DEPTH_ON =
  'aria-pressed:bg-forest-deep aria-pressed:text-white aria-pressed:hover:bg-forest-deep aria-pressed:hover:text-white data-[state=on]:bg-forest-deep data-[state=on]:text-white data-[state=on]:hover:bg-forest-deep data-[state=on]:hover:text-white'
const DEPTH_ON_RELAX =
  'aria-pressed:bg-sage aria-pressed:text-forest-night aria-pressed:hover:bg-sage aria-pressed:hover:text-forest-night data-[state=on]:bg-sage data-[state=on]:text-forest-night data-[state=on]:hover:bg-sage data-[state=on]:hover:text-forest-night'

/** Position and shape of the stack: a row on desktop, a column on phone and landscape. */
function containerClass(relax: boolean, handheld: boolean, land: boolean): string {
  return cn(
    'absolute right-3 z-20 flex items-center gap-0.5 rounded-xl border p-[3px]',
    relax
      ? 'top-4 right-4 border-transparent bg-forest-night/95'
      : 'bottom-4 border-sand-border bg-paper/95 shadow-[0_6px_16px_-10px_rgba(20,40,28,0.5)] @max-[1100px]:bottom-[78px]',
    handheld && 'flex-col',
    handheld && relax && 'top-[calc(12px+env(safe-area-inset-top))] right-3',
    handheld && !relax && 'right-2.5 bottom-[72px] @max-[1100px]:bottom-[72px]',
    land && !relax && 'bottom-1.5 @max-[1100px]:bottom-1.5',
  )
}

function ZoomStep({
  dir,
  zoomPct,
  className,
}: {
  dir: 'in' | 'out'
  zoomPct: number
  className: string
}) {
  const out = dir === 'out'
  const label = out ? 'Zoom out' : 'Zoom in'
  return (
    <Button
      variant="ghost"
      aria-label={label}
      title={label}
      disabled={out ? zoomPct <= 100 : zoomPct >= 400}
      onClick={() => zoomByStep(out ? 1 / ZOOM_STEP : ZOOM_STEP)}
      className={className}
    >
      <LineIcon name={out ? 'minus' : 'plus'} />
    </Button>
  )
}

/**
 * Zoom out, zoom percent (press for the whole tank), zoom in, frame the plants, depth effects
 * (prototype #view-ctl). Bottom right of the stage; it clears the care toolbar when the stage is
 * under 1100 px wide. In relax mode it moves top right and goes dark like the dock.
 */
export function ViewControls() {
  const zoomPct = useAtomValue(zoomPctAtom)
  const depthOn = useAtomValue(depthOnAtom)
  const relax = useAtomValue(relaxModeAtom)
  const handheld = useAtomValue(isHandheldAtom)
  const land = useAtomValue(layoutModeAtom) === 'land'
  const sheetOpen = useAtomValue(stagePadPxAtom) > 0
  const showPercent = !(handheld && sheetOpen)

  const toggleDepth = (next: boolean) => {
    appStore.set(depthOnAtom, next)
    showToast(next ? 'Depth effects on' : 'Depth effects off: flat view')
  }

  const tone = cn(relax && BTN_RELAX, handheld && BTN_TOUCH)
  return (
    <div
      id="view-ctl"
      role="group"
      aria-label="View"
      className={containerClass(relax, handheld, land)}
    >
      {!handheld && <ZoomStep dir="out" zoomPct={zoomPct} className={cn(BTN, tone)} />}
      {showPercent && (
        <Button
          variant="ghost"
          title="Show the whole tank (0)"
          onClick={goHome}
          className={cn(BTN, 'min-w-[46px]', tone)}
        >
          {zoomPct}%
        </Button>
      )}
      {!handheld && <ZoomStep dir="in" zoomPct={zoomPct} className={cn(BTN, tone)} />}
      {showPercent && (
        <span
          aria-hidden="true"
          className={cn(
            'mx-0.5 h-[18px] w-px',
            handheld && 'mx-0 my-0.5 h-px w-[18px]',
            relax ? 'bg-white/15' : 'bg-sand-border',
          )}
        />
      )}
      <Button
        variant="ghost"
        aria-label="Frame the plants"
        title="Frame the plants (F)"
        onClick={() => frameThePlants(relax)}
        className={cn(BTN, tone)}
      >
        <LineIcon name="frame" />
      </Button>
      <Toggle
        pressed={depthOn}
        onPressedChange={toggleDepth}
        aria-label="Depth effects"
        title="Depth effects: planes, soft shadows, haze, glass"
        className={cn(BTN, relax ? DEPTH_ON_RELAX : DEPTH_ON, tone)}
      >
        <LineIcon name="layers" />
      </Toggle>
    </div>
  )
}
