import { useAtomValue } from 'jotai'
import { Toggle } from '@/components/ui/toggle'
import { POUR_CONTAINERS } from '@/data/substrates'
import { getContainerVectorSVG } from '@/lib/vesselPreview'
import { appStore } from '@/store/appStore'
import { activePourMaterialAtom, activeToolAtom } from '@/store/studio'
import { showToast } from '@/store/toast'

export function PourContainersGrid() {
  const activeTool = useAtomValue(activeToolAtom)
  const activePourMaterial = useAtomValue(activePourMaterialAtom)

  const select = (layerId: string) => {
    if (activePourMaterial === layerId && activeTool === 'pour') {
      appStore.set(activePourMaterialAtom, null)
      appStore.set(activeToolAtom, 'select')
      return
    }
    appStore.set(activePourMaterialAtom, layerId)
    appStore.set(activeToolAtom, 'pour')
    const layer = POUR_CONTAINERS.find((l) => l.id === layerId)
    if (!layer) return
    showToast(
      layerId === 'water'
        ? 'Hold and drag inside the tank to pour water'
        : layerId === 'siphon'
          ? 'Hold inside the tank to siphon water or scoop substrate'
          : `Hold and drag inside the tank to scatter ${layer.name}`,
    )
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {POUR_CONTAINERS.map((layer) => {
        const active = activeTool === 'pour' && activePourMaterial === layer.id
        return (
          <Toggle
            key={layer.id}
            variant="card"
            size="auto"
            pressed={active}
            onPressedChange={() => select(layer.id)}
            className="min-w-0 aria-pressed:scale-[1.01]"
          >
            <span dangerouslySetInnerHTML={{ __html: getContainerVectorSVG(layer, active) }} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[11px] font-bold">{layer.containerName}</span>
              <span className="block truncate text-[10px] text-stone-light group-aria-pressed/toggle:text-emerald-200">
                {layer.name}
              </span>
            </span>
          </Toggle>
        )
      })}
    </div>
  )
}
