import { useAtomValue } from 'jotai'
import { useReducer } from 'react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { SpecimenButtons, TransformButtons } from '@/components/stage/ItemInspectorControls'
import { findCatalogDef } from '@/data/catalog'
import type { CatalogDef, PlacedItem } from '@/data/types'
import { mutateWorld, tryGetWorld } from '@/engine/engineBridge'
import { deleteItem, duplicateItem } from '@/engine/items'
import { play } from '@/services/audio'
import type { EngineWorld } from '@/engine/world'
import { appStore } from '@/store/appStore'
import {
  plantingStageAtom,
  relaxModeAtom,
  selectedIdAtom,
  substratesAtom,
  waterSplitAtom,
  worldSnapshotAtom,
} from '@/store/studio'

const HABITAT_NAMES: Record<string, string> = {
  water: 'in the pool',
  shore: 'pool and shore',
  land: 'on land',
  glass: 'on the glass',
}

/** Sentence-case meta line under the name (prototype updateInspectorUI). */
function inspectorMeta(item: PlacedItem, def: CatalogDef | null): string {
  if (item.category === 'flora') {
    return `Plant · ${item.stage || 'mature'} · ${Math.round(item.vitality || 98)}% health`
  }
  if (item.category === 'fauna') {
    const habitat = (def?.category === 'fauna' && HABITAT_NAMES[def.habitat]) || 'on land'
    return `Animal · ${habitat} · ${item.aiState || 'wandering'}`
  }
  return 'Hardscape'
}

/**
 * Floating specimen inspector. It reads the selected item from the live (mutable) world and re-renders after
 * each UI mutation (local tick plus the store snapshot mutateWorld commits), never per engine frame.
 */
export function ItemInspector() {
  const selectedId = useAtomValue(selectedIdAtom)
  const relaxMode = useAtomValue(relaxModeAtom)
  useAtomValue(worldSnapshotAtom)
  const [, bump] = useReducer((n: number) => n + 1, 0)

  if (!selectedId || relaxMode) return null
  const item = tryGetWorld()?.items.find((i) => i.uid === selectedId)
  if (!item) return null
  const def = findCatalogDef(item.id)

  const apply = (fn: (w: EngineWorld) => void) => {
    mutateWorld(fn)
    bump()
  }

  const meta = inspectorMeta(item, def)

  const onDuplicate = () => {
    const plantingStage = appStore.get(plantingStageAtom)
    const substrates = appStore.get(substratesAtom)
    const waterSplit = appStore.get(waterSplitAtom)
    let uid: string | null = null
    apply((w) => {
      uid =
        duplicateItem(w, item.uid, plantingStage, {
          substrates,
          waterSplit,
          terrainContour: w.terrainContour,
        })?.uid ?? null
    })
    if (uid) {
      appStore.set(selectedIdAtom, uid)
      play('repot')
    }
  }

  const onDelete = () => {
    apply((w) => deleteItem(w, item.uid))
    appStore.set(selectedIdAtom, null)
    play('prune')
  }

  return (
    <div
      id="item-inspector"
      className="absolute left-1/2 top-4 z-30 flex -translate-x-1/2 items-center gap-2.5 rounded-2xl border border-sand-border bg-paper/95 px-3.5 py-2 shadow-xl backdrop-blur-md"
    >
      <div className="whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          <span data-testid="insp-name" className="text-xs font-bold text-forest-ink">
            {def ? def.name : 'Specimen'}
          </span>
          {item.parentUid && (
            <Badge className="h-auto rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
              🪨 Mounted
            </Badge>
          )}
        </div>
        <div data-testid="insp-meta" className="text-[10px] font-semibold text-stone-light">
          {meta}
        </div>
      </div>

      <Separator orientation="vertical" className="bg-sand-border" />

      <TransformButtons uid={item.uid} apply={apply} />

      <Separator orientation="vertical" className="bg-sand-border" />

      <SpecimenButtons item={item} apply={apply} onDuplicate={onDuplicate} onDelete={onDelete} />
    </div>
  )
}
