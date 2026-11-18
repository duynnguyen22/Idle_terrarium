import { useAtomValue, useSetAtom } from 'jotai'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { hasGrowLampAtom, lampColorAtom, type LampColor } from '@/store/studio'
import { showToast } from '@/store/toast'

const COLORS: { color: LampColor; label: string; kelvin: string; dot: string }[] = [
  { color: 'white', label: 'White', kelvin: '6500 K', dot: '#f3f7ff' },
  { color: 'warm', label: 'Warm', kelvin: '3000 K', dot: '#ffc27a' },
]
const TOAST_COPY: Record<LampColor, string> = {
  warm: 'Warm light, 3000 K: a cosy glow. Plants grow about 10% slower.',
  white: 'White light, 6500 K: best for growth.',
}

/** White / Warm grow-light switch under the Grow lamp row; disabled when the lamp is removed. */
export function LampColorControl() {
  const lampColor = useAtomValue(lampColorAtom)
  const hasGrowLamp = useAtomValue(hasGrowLampAtom)
  const setLampColor = useSetAtom(lampColorAtom)

  const choose = (color: string) => {
    if (!color || color === lampColor) return
    setLampColor(color as LampColor)
    showToast(TOAST_COPY[color as LampColor])
  }

  return (
    <ToggleGroup
      type="single"
      variant="raised"
      size="sm"
      spacing={0.5}
      aria-label="Lamp light colour"
      value={lampColor}
      disabled={!hasGrowLamp}
      onValueChange={choose}
      className="mr-2.5 mb-2 ml-[50px] grid w-auto grid-cols-2 rounded-[9px] bg-sand-pale p-0.5"
    >
      {COLORS.map(({ color, label, kelvin, dot }) => (
        <ToggleGroupItem
          key={color}
          value={color}
          className="h-[26px] gap-1.5 rounded-[7px] text-[11.5px] hover:bg-transparent hover:text-forest-ink data-[state=on]:font-semibold data-[state=on]:text-forest-ink data-[state=on]:shadow-none disabled:opacity-60"
        >
          <span
            aria-hidden="true"
            className="size-2.5 rounded-full border border-black/15"
            style={{ background: dot }}
          />
          {label} <small className="text-[10px] font-normal opacity-70">{kelvin}</small>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
