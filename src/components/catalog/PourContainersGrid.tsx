import { POUR_CONTAINERS } from '@/data/substrates'
import { getContainerVectorSVG } from '@/lib/vesselPreview'
import { showToast } from '@/store/toastStore'
import { useStudioStore } from '@/store/useStudioStore'

export function PourContainersGrid() {
  const activeTool = useStudioStore((s) => s.activeTool)
  const activePourMaterial = useStudioStore((s) => s.activePourMaterial)

  const select = (layerId: string) => {
    const { setActivePourMaterial, setActiveTool } = useStudioStore.getState()
    if (activePourMaterial === layerId && activeTool === 'pour') {
      setActivePourMaterial(null)
      setActiveTool('select')
      return
    }
    setActivePourMaterial(layerId)
    setActiveTool('pour')
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
          <button
            key={layer.id}
            type="button"
            aria-pressed={active}
            onClick={() => select(layer.id)}
            className={`flex min-w-0 items-center gap-2 rounded-2xl border p-2 text-left transition ${
              active
                ? 'scale-[1.01] border-forest-deep bg-forest-deep text-white shadow-sm'
                : 'border-sand-border bg-white text-ink-deep hover:bg-sand-warm'
            }`}
          >
            <span dangerouslySetInnerHTML={{ __html: getContainerVectorSVG(layer, active) }} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[11px] font-bold">{layer.containerName}</span>
              <span
                className={`block truncate text-[10px] ${active ? 'text-emerald-200' : 'text-stone-light'}`}
              >
                {layer.name}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
