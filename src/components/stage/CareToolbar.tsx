import { useAtom, useAtomValue } from 'jotai'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'
import { LineIcon } from '@/components/ui/LineIcon'
import type { IconName } from '@/components/ui/lineIconPaths'
import { Toggle } from '@/components/ui/toggle'
import { SUBSTRATES_BY_ID, type SubstrateId } from '@/data/substrates'
import { isHandheldAtom } from '@/store/layout'
import { activePourMaterialAtom, activeToolAtom } from '@/store/studio'

const TOOLS: readonly { id: string; icon: IconName; label: string }[] = [
  { id: 'select', icon: 'hand', label: 'Move / Mount' },
  { id: 'mist', icon: 'drop', label: 'Mist Spray' },
  { id: 'prune', icon: 'scissors', label: 'Prune' },
  { id: 'boost', icon: 'sparkle', label: 'Bio-Feed' },
  { id: 'scrub', icon: 'eraser', label: 'Scrub Mold' },
]

const TOOL = 'h-9 gap-1.5 rounded-xl px-3 text-xs font-semibold'
/** Touch size: 44 px square icon buttons (the label moves to aria-label and title). */
const TOUCH_ICON = 'size-11 rounded-[14px] px-0'

function pourLabel(material: string): string {
  const layer = SUBSTRATES_BY_ID[material as SubstrateId] as
    (typeof SUBSTRATES_BY_ID)[SubstrateId] | undefined
  if (!layer) return 'Pouring Material'
  return layer.id === 'water' ? 'Pouring: Lake Water' : `Scattering: ${layer.name}`
}

export function CareToolbar() {
  const [activeTool, setActiveTool] = useAtom(activeToolAtom)
  const [activePourMaterial, setActivePourMaterial] = useAtom(activePourMaterialAtom)
  const handheld = useAtomValue(isHandheldAtom)

  const pick = (tool: string) => {
    setActiveTool(tool)
    if (tool !== 'pour') setActivePourMaterial(null)
  }
  const pouring = activeTool === 'pour' && !!activePourMaterial

  return (
    <div
      id="care-toolbar"
      role="toolbar"
      aria-label="Care tools"
      className={cn(
        'absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-sand-border bg-paper/95 px-3 py-2 shadow-lg backdrop-blur-md',
        handheld && 'bottom-2.5 max-w-none gap-0.5 overflow-visible rounded-[18px] p-1',
      )}
    >
      {TOOLS.map((t, i) => {
        // Pressing the active tool again keeps it chosen: one tool is always in hand.
        const tool = (
          <Toggle
            key={t.id}
            variant="solid"
            pressed={activeTool === t.id}
            onPressedChange={() => pick(t.id)}
            aria-label={handheld ? t.label : undefined}
            title={handheld ? t.label : undefined}
            className={cn(TOOL, 'text-ink-soft hover:bg-white', handheld && TOUCH_ICON)}
          >
            <LineIcon name={t.icon} className={cn(handheld ? 'size-5' : undefined)} />
            {!handheld && <span>{t.label}</span>}
          </Toggle>
        )
        // The pour indicator sits right after Move / Mount, as in the prototype markup.
        if (i === 0 && pouring) {
          return [
            tool,
            <Button
              key="pour"
              aria-pressed
              onClick={() => {
                setActiveTool('select')
                setActivePourMaterial(null)
              }}
              className={cn(TOOL, 'bg-amber-700 text-white hover:bg-amber-800', handheld && 'h-11')}
            >
              <LineIcon name="jar" />
              <span className={cn(handheld && 'max-w-[96px] truncate')}>
                {pourLabel(activePourMaterial)}
              </span>
            </Button>,
          ]
        }
        return tool
      })}
    </div>
  )
}
