import { Button } from '@/components/ui/button'
import { LineIcon, type IconName } from '@/components/ui/LineIcon'
import { BIOME_PRESETS, type BiomePreset } from '@/data/presets'
import { mutateWorld } from '@/engine/engineBridge'
import { applyPreset } from '@/engine/presets'
import { showToast } from '@/store/toast'

/** Card copy per recipe (prototype `.recipe-btn`). */
const CARD: Record<BiomePreset['id'], { icon: IconName; name: string; sub: string }> = {
  falls: { icon: 'waves', name: 'Falls Lake', sub: '30% pool, waterfall' },
  tropical: { icon: 'palm', name: 'Rainforest', sub: 'All land, sealed' },
  paludarium: { icon: 'drop', name: 'Lagoon', sub: '45% pool for fish' },
  desert: { icon: 'cactus', name: 'Arid', sub: 'Open top, sand' },
}

export function BiomeRecipes() {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {BIOME_PRESETS.map((p) => {
        const c = CARD[p.id]
        return (
          <Button
            key={p.id}
            variant="tile"
            size="auto"
            onClick={() => {
              let message = ''
              mutateWorld((w) => {
                message = applyPreset(w, p.id)
              })
              showToast(message)
            }}
            className="gap-2 rounded-xl px-2.5 py-2"
          >
            <LineIcon name={c.icon} />
            <span className="min-w-0">
              <b className="block text-xs font-semibold">{c.name}</b>
              <small className="block text-[10.5px] text-stone">{c.sub}</small>
            </span>
          </Button>
        )
      })}
    </div>
  )
}
