import { mutateWorld } from '@/engine/engineBridge'
import { selectHardware } from '@/store/selectors'
import { showToast } from '@/store/toastStore'
import { useStudioStore } from '@/store/useStudioStore'
import { BiomeRecipes } from './BiomeRecipes'
import { HardwareToggles } from './HardwareToggles'
import { PourContainersGrid } from './PourContainersGrid'
import { SubstrateSliders, TotalSubstrateDepth } from './SubstrateSliders'
import { VesselGrid } from './VesselGrid'

const H2 = 'text-xs font-bold uppercase tracking-wider text-stone'

export function VesselTab() {
  const hasLid = useStudioStore((s) => selectHardware(s).hasLid)
  const toggleHardware = useStudioStore((s) => s.toggleHardware)

  const levelTerrain = () => {
    mutateWorld((w) => {
      w.terrainContour = new Array<number>(w.terrainContour.length).fill(0)
      w.surfaceGrains = []
    })
    showToast('✨ Leveled substrate terrain & cleared loose surface grains')
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className={H2}>1. Glass Enclosure</h2>
          <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-forest-deep">
            <input
              type="checkbox"
              checked={hasLid}
              onChange={() => toggleHardware('hasLid')}
              className="h-3.5 w-3.5 rounded accent-forest-deep"
            />
            <span>Cork Lid Sealed</span>
          </label>
        </div>
        <VesselGrid />
        <HardwareToggles />
      </div>

      <div>
        <h2 className={`${H2} mb-2`}>2. One-Click Biome Recipes</h2>
        <BiomeRecipes />
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <h2 className={H2}>3. Scatter &amp; Pour Containers</h2>
          <button
            type="button"
            onClick={levelTerrain}
            className="text-[10px] font-semibold text-forest-mid hover:underline"
          >
            Level Terrain
          </button>
        </div>
        <p className="mb-2.5 text-[11px] leading-snug text-stone">
          Pick up a jar or pitcher below, then{' '}
          <strong className="font-semibold text-forest-deep">
            click &amp; hold inside the enclosure
          </strong>{' '}
          to scatter pebbles, sculpt sand mounds, or pour a paludarium lake.
        </p>
        <PourContainersGrid />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className={H2}>4. Fine-Tune Layer Depths (mm)</h2>
          <TotalSubstrateDepth />
        </div>
        <SubstrateSliders />
      </div>
    </div>
  )
}
