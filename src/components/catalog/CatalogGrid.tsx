import { CATALOG, FAUNA_BY_ID, FAUNA_GROUPS } from '@/data/catalog'
import { computeCareReport } from '@/engine/care'
import { mutateWorld } from '@/engine/engineBridge'
import { addItem } from '@/engine/items'
import { play } from '@/hooks/useAudio'
import { appStore } from '@/store/appStore'
import { selectedIdAtom, studioStateAtom } from '@/store/studio'
import { showToast } from '@/store/toast'
import { CatalogCard } from './CatalogCard'

export type CatalogCategory = keyof typeof CATALOG

/**
 * Click a card to place the item at the prototype's default position and select it. A fresh care report
 * (not the throttled copy in the telemetry store) names any issue the new species triggers (prototype addItemToTerrarium).
 */
export function CatalogGrid({ category }: { category: CatalogCategory }) {
  const place = (defId: string) => {
    const store = appStore.get(studioStateAtom)
    const { plantingStage, substrates, waterSplit } = store
    let uid: string | null = null
    let issueText: string | null = null
    mutateWorld((w) => {
      uid =
        addItem(w, defId, plantingStage, {
          terrain: { substrates, waterSplit, terrainContour: w.terrainContour },
        })?.uid ?? null
      if (!uid) return
      const issues = computeCareReport({
        ...store,
        ...w.env,
        items: w.items,
        mineralSpots: w.mineralSpots,
      })
      issueText = issues.find((i) => i.species?.includes(defId))?.text ?? null
    })
    if (uid) {
      appStore.set(selectedIdAtom, uid)
      play('repot')
    }
    if (issueText) showToast(issueText)
  }
  if (category === 'fauna') {
    return (
      <div className="grid grid-cols-2 gap-2.5" data-testid="catalog-fauna">
        {FAUNA_GROUPS.map((group, i) => (
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
              const def = { ...FAUNA_BY_ID[id], id }
              return <CatalogCard key={id} def={def} onSelect={() => place(id)} />
            })}
          </section>
        ))}
      </div>
    )
  }
  return (
    <div className="grid grid-cols-2 gap-2.5" data-testid={`catalog-${category}`}>
      {CATALOG[category].map((def) => (
        <CatalogCard key={def.id} def={def} onSelect={() => place(def.id)} />
      ))}
    </div>
  )
}
