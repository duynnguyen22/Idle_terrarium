import { useId } from 'react'
import { useAtom } from 'jotai'
import { Slider } from '@/components/ui/slider'
import { MAX_BACKDROP_HAZE } from '@/store/migrations'
import { backdropHazeAtom } from '@/store/studio'

/** The "Depth haze" slider under the backdrop grid. */
export function BackdropHazeControl() {
  const [haze, setBackdropHaze] = useAtom(backdropHazeAtom)
  const hazeId = useId()
  return (
    <div className="mt-2.5 flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span id={hazeId} className="font-medium text-ink-soft">
          Depth haze
        </span>
        <span className="text-[11px] text-stone tabular-nums">{haze}%</span>
      </div>
      <Slider
        aria-labelledby={hazeId}
        min={0}
        max={MAX_BACKDROP_HAZE}
        value={[haze]}
        onValueChange={([v]) => setBackdropHaze(v!)}
      />
      <p className="text-[10.5px] text-stone">
        More haze pushes the scene further back behind your plants.
      </p>
    </div>
  )
}
