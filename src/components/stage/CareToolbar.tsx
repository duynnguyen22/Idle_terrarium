import { SUBSTRATES_BY_ID, type SubstrateId } from '@/data/substrates'
import { selectActiveTool } from '@/store/selectors'
import { useStudioStore } from '@/store/useStudioStore'

const TOOLS = [
  { id: 'select', icon: '🖐️', label: 'Move / Mount' },
  { id: 'mist', icon: '💦', label: 'Mist Spray' },
  { id: 'prune', icon: '✂️', label: 'Prune' },
  { id: 'boost', icon: '✨', label: 'Bio-Feed' },
  { id: 'scrub', icon: '🧽', label: 'Scrub Mold' },
] as const

const BASE =
  'inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-xl px-3 text-xs font-semibold transition'

function pourLabel(material: string): string {
  const layer = SUBSTRATES_BY_ID[material as SubstrateId] as
    (typeof SUBSTRATES_BY_ID)[SubstrateId] | undefined
  if (!layer) return 'Pouring Material'
  return layer.id === 'water' ? 'Pouring: Lake Water' : `Scattering: ${layer.name}`
}

export function CareToolbar() {
  const activeTool = useStudioStore(selectActiveTool)
  const activePourMaterial = useStudioStore((s) => s.activePourMaterial)
  const setActiveTool = useStudioStore((s) => s.setActiveTool)
  const setActivePourMaterial = useStudioStore((s) => s.setActivePourMaterial)

  const pick = (tool: string) => {
    setActiveTool(tool)
    if (tool !== 'pour') setActivePourMaterial(null)
  }
  const pouring = activeTool === 'pour' && !!activePourMaterial

  return (
    <div
      id="care-toolbar"
      role="toolbar"
      aria-label="Care tools"
      className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-sand-border bg-paper/95 px-3 py-2 shadow-lg backdrop-blur-md"
    >
      {TOOLS.map((t, i) => {
        const active = activeTool === t.id
        const button = (
          <button
            key={t.id}
            type="button"
            aria-pressed={active}
            onClick={() => pick(t.id)}
            className={`${BASE} ${active ? 'bg-forest-deep text-white' : 'text-ink-soft hover:bg-white'}`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        )
        // The pour indicator sits right after Move / Mount, as in the prototype markup.
        if (i === 0 && pouring) {
          return [
            button,
            <button
              key="pour"
              type="button"
              aria-pressed
              onClick={() => {
                setActiveTool('select')
                setActivePourMaterial(null)
              }}
              className={`${BASE} bg-amber-700 text-white`}
            >
              <span>🫙</span>
              <span>{pourLabel(activePourMaterial)}</span>
            </button>,
          ]
        }
        return button
      })}
    </div>
  )
}
