import { CATALOG } from '@/data/catalog'
import { computeCareReport } from '@/engine/care'
import { mutateWorld } from '@/engine/engineBridge'
import { addItem } from '@/engine/items'
import { play } from '@/hooks/useAudio'
import { showToast } from '@/store/toastStore'
import { useStudioStore } from '@/store/useStudioStore'
import { CatalogCard } from './CatalogCard'

export type CatalogCategory = keyof typeof CATALOG

/**
 * Click a card to place the item at the prototype's default position and select it. A fresh care report
 * (not the throttled copy in the telemetry store) names any issue the new species triggers (prototype addItemToTerrarium).
 */
export function CatalogGrid({ category }: { category: CatalogCategory }) {
  const place = (defId: string) => {
    const store = useStudioStore.getState()
    const { plantingStage, substrates, waterSplit, selectItem } = store
    let uid: string | null = null
    let issueText: string | null = null
    mutateWorld((w) => {
      uid =
        addItem(w, defId, plantingStage, {
          terrain: { substrates, waterSplit, terrainContour: w.terrainContour },
        })?.uid ?? null
      if (!uid) return
      const issues = computeCareReport({ ...store, ...w.env, items: w.items })
      issueText = issues.find((i) => i.species?.includes(defId))?.text ?? null
    })
    if (uid) {
      selectItem(uid)
      play('repot')
    }
    if (issueText) showToast(issueText)
  }
  return (
    <div className="grid grid-cols-2 gap-2.5" data-testid={`catalog-${category}`}>
      {CATALOG[category].map((def) => (
        <CatalogCard key={def.id} def={def} onSelect={() => place(def.id)} />
      ))}
    </div>
  )
}
