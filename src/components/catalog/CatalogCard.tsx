import type { CatalogId } from '@/data/catalog'
import type { CatalogDef } from '@/data/types'
import { useSpriteThumbnail } from '@/hooks/useSpriteThumbnail'

export type CatalogEntry = CatalogDef & { id: CatalogId }

function Badge({ def }: { def: CatalogDef }) {
  if (def.category === 'flora' && def.canMountOnRock) {
    return (
      <span className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700">
        🪨 Mountable
      </span>
    )
  }
  if (def.category === 'hardscape' && def.mountPoints) {
    return (
      <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-800">
        {def.mountPoints.length} Ledges
      </span>
    )
  }
  return null
}

export function CatalogCard({ def, onSelect }: { def: CatalogEntry; onSelect: () => void }) {
  const src = useSpriteThumbnail(def.id)
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex flex-col items-center rounded-2xl border border-sand-border bg-white p-2.5 text-left shadow-2xs transition hover:bg-linen"
    >
      <span className="mb-1.5 flex h-16 w-16 items-center justify-center transition group-hover:scale-105">
        <img src={src} alt="" className="pointer-events-none h-full w-full object-contain" />
      </span>
      <span className="w-full">
        <span className="block truncate text-xs font-bold text-forest-ink">{def.name}</span>
        <span className="mt-0.5 line-clamp-2 block text-[10px] leading-snug text-stone-light">
          {def.desc}
        </span>
        <span className="mt-1.5 block">
          <Badge def={def} />
        </span>
      </span>
    </button>
  )
}
