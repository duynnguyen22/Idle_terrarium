import type { CatalogDef } from '@/data/types'
import { CatalogCard, type CatalogEntry } from './CatalogCard'

interface Props<Id extends string> {
  category: string
  groups: readonly { label: string; ids: readonly Id[] }[]
  byId: Readonly<Record<Id, Omit<CatalogDef, 'id'>>>
  onPlace: (id: string) => void
}

/** Catalog cards under a count-badged heading per group (fauna and decor share this layout). */
export function GroupedCatalogGrid<Id extends string>({
  category,
  groups,
  byId,
  onPlace,
}: Props<Id>) {
  return (
    <div className="grid grid-cols-2 gap-2.5" data-testid={`catalog-${category}`}>
      {groups.map((group, i) => (
        <section key={group.label} className="contents" aria-label={group.label}>
          <h3
            className={`col-span-2 mx-0.5 flex items-center gap-1.5 text-xs font-semibold text-forest-ink ${i ? 'mt-2.5' : ''}`}
          >
            {group.label}
            <span className="rounded-full bg-[#e4e8e0] px-[7px] text-[10.5px] font-semibold text-[#5b665e]">
              {group.ids.length}
            </span>
          </h3>
          {group.ids.map((id) => {
            const def = { ...byId[id], id } as CatalogEntry
            return <CatalogCard key={id} def={def} onSelect={() => onPlace(id)} />
          })}
        </section>
      ))}
    </div>
  )
}
