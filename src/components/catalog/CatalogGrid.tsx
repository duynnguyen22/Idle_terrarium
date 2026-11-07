import { CATALOG } from '@/data/catalog'
import { mutateWorld } from '@/engine/engineBridge'
import { addItem } from '@/engine/items'
import { play } from '@/hooks/useAudio'
import { useStudioStore } from '@/store/useStudioStore'
import { CatalogCard } from './CatalogCard'

export type CatalogCategory = keyof typeof CATALOG

/** Click a card to place the item at the prototype's default position and select it. */
export function CatalogGrid({ category }: { category: CatalogCategory }) {
  const place = (defId: string) => {
    const { plantingStage, substrates, waterSplit, selectItem } = useStudioStore.getState()
    let uid: string | null = null
    mutateWorld((w) => {
      uid =
        addItem(w, defId, plantingStage, {
          terrain: { substrates, waterSplit, terrainContour: w.terrainContour },
        })?.uid ?? null
    })
    if (uid) {
      selectItem(uid)
      play('repot')
    }
  }
  return (
    <div className="grid grid-cols-2 gap-2.5" data-testid={`catalog-${category}`}>
      {CATALOG[category].map((def) => (
        <CatalogCard key={def.id} def={def} onSelect={() => place(def.id)} />
      ))}
    </div>
  )
}
