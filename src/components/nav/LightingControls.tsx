import { useAtomValue, useSetAtom } from 'jotai'
import { cn } from 'cn'
import { LineIcon } from '@/components/ui/LineIcon'
import type { IconName } from '@/components/ui/lineIconPaths'
import { Separator } from '@/components/ui/separator'
import { Toggle } from '@/components/ui/toggle'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { LightingId } from '@/data/types'
import { isHandheldAtom } from '@/store/layout'
import { autoLightSyncAtom, lightingAtom } from '@/store/studio'
import { showToast } from '@/store/toast'

const PHASES: { id: LightingId; icon: IconName; label: string }[] = [
  { id: 'dawn', icon: 'sunrise', label: 'Dawn' },
  { id: 'sunlight', icon: 'sun', label: 'Day' },
  { id: 'twilight', icon: 'sunset', label: 'Dusk' },
  { id: 'night', icon: 'moon', label: 'Night' },
]

/** Touch size: 40 px buttons. */
const TOUCH = 'h-10 min-w-10'
const ITEM = 'gap-1 px-2 text-xs font-medium data-[state=on]:font-semibold'

/** Floating light switcher in the canvas corner (prototype #light-control); hidden in relax mode. */
export function LightingControls() {
  const lighting = useAtomValue(lightingAtom)
  const autoSync = useAtomValue(autoLightSyncAtom)
  const handheld = useAtomValue(isHandheldAtom)
  const setLighting = useSetAtom(lightingAtom)
  const setAutoLightSync = useSetAtom(autoLightSyncAtom)

  const choose = (id: string) => {
    if (!id) return // pressing the active phase again keeps it selected
    setLighting(id as LightingId)
    setAutoLightSync(false)
  }
  const toggleAuto = () => {
    const next = !autoSync
    setAutoLightSync(next)
    showToast(next ? 'Lighting follows your local clock' : 'Lighting set to manual control')
  }

  return (
    <div
      id="light-control"
      role="group"
      aria-label="Lighting"
      className={cn(
        'absolute right-3 top-3 z-20 flex items-center gap-0.5 rounded-xl border border-sand-border bg-paper/95 p-1 shadow-sm',
        handheld && 'top-2 right-2 max-w-[calc(100%-16px)] overflow-visible',
      )}
    >
      <ToggleGroup
        type="single"
        variant="raised"
        spacing={0.5}
        aria-label="Lighting phase"
        value={lighting}
        onValueChange={choose}
      >
        {PHASES.map((p) => (
          <ToggleGroupItem
            key={p.id}
            value={p.id}
            aria-label={p.label}
            title={p.label}
            className={cn(ITEM, handheld && TOUCH)}
          >
            <LineIcon name={p.icon} />
            <span className="hidden 2xl:inline">{p.label}</span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <Separator orientation="vertical" className="mx-0.5 h-5" />
      <Toggle
        variant="mint"
        pressed={autoSync}
        onPressedChange={toggleAuto}
        title="Follow your local clock"
        className={cn('gap-1 px-2 text-xs font-semibold', handheld && TOUCH)}
      >
        <LineIcon name="auto" />
        <span>Auto</span>
      </Toggle>
    </div>
  )
}
