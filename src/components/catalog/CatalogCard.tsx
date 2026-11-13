import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { CatalogId } from '@/data/catalog'
import type { CatalogDef } from '@/data/types'
import { useSpriteThumbnail } from '@/hooks/useSpriteThumbnail'

export type CatalogEntry = CatalogDef & { id: CatalogId }

const TAG = 'h-auto rounded px-1.5 py-0.5 text-[9px] font-semibold'

function CatalogTag({ def }: { def: CatalogDef }) {
  if (def.category === 'flora' && def.canMountOnRock) {
    return (
      <Badge
        variant="outline"
        className={`${TAG} border-emerald-200 bg-emerald-50 text-emerald-700`}
      >
        Mountable
      </Badge>
    )
  }
  if (def.category === 'hardscape' && def.mountPoints) {
    return (
      <Badge variant="outline" className={`${TAG} border-amber-200 bg-amber-50 text-amber-800`}>
        {def.mountPoints.length} Ledges
      </Badge>
    )
  }
  return null
}

export function CatalogCard({ def, onSelect }: { def: CatalogEntry; onSelect: () => void }) {
  const src = useSpriteThumbnail(def.id)
  return (
    <Button
      variant="tile"
      size="auto"
      onClick={onSelect}
      className="group flex-col items-center gap-0 rounded-2xl border-sand-border p-2.5 shadow-2xs"
    >
      <span
        data-testid="catalog-thumb"
        className="mb-2 flex aspect-square w-full max-w-[104px] items-center justify-center rounded-xl bg-thumb-tile p-2.5 transition group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
      >
        <img src={src} alt="" className="pointer-events-none size-full object-contain" />
      </span>
      <span className="w-full">
        <span className="block truncate text-xs font-bold text-forest-ink">{def.name}</span>
        <span className="mt-0.5 line-clamp-2 block text-[10px] leading-snug text-stone-light">
          {def.desc}
        </span>
        <span className="mt-1.5 block">
          <CatalogTag def={def} />
        </span>
      </span>
    </Button>
  )
}
