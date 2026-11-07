import { mutateWorld } from '@/engine/engineBridge'
import { selectHardware } from '@/store/selectors'
import { showToast } from '@/store/toastStore'
import { useStudioStore } from '@/store/useStudioStore'
import { BiomeRecipes } from './BiomeRecipes'
import { HardwarePanel } from './HardwarePanel'
import { PourContainersGrid } from './PourContainersGrid'
import { SubstrateSliders, TotalSubstrateDepth } from './SubstrateSliders'
import { VesselGrid } from './VesselGrid'

const H2 = 'text-xs font-semibold text-forest-deep'

export function VesselTab() {
  const hasLid = useStudioStore((s) => selectHardware(s).hasLid)
  const toggleHardware = useStudioStore((s) => s.toggleHardware)

  const levelTerrain = () => {
    mutateWorld((w) => {
      w.terrainContour = new Array<number>(w.terrainContour.length).fill(0)
      w.surfaceGrains = []
    })
    showToast('Terrain levelled and loose grains cleared')
  }

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className={H2}>Enclosure</h2>
          <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-forest-deep">
            <input
              type="checkbox"
              checked={hasLid}
              onChange={() => toggleHardware('hasLid')}
              className="h-3.5 w-3.5 rounded accent-forest-deep"
            />
            <span>Lid sealed</span>
          </label>
        </div>
        <VesselGrid />
        <HardwarePanel />
      </section>

      <section>
        <h2 className={`${H2} mb-2`}>Build recipes</h2>
        <BiomeRecipes />
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className={H2}>Layer stack</h2>
          <TotalSubstrateDepth />
        </div>
        <SubstrateSliders />
      </section>

      <section>
        <div className="mb-1.5 flex items-center justify-between">
          <h2 className={H2}>Scatter &amp; pour</h2>
          <button
            type="button"
            onClick={levelTerrain}
            className="text-[11px] font-semibold text-forest-mid hover:underline"
          >
            Level terrain
          </button>
        </div>
        <p className="mb-2.5 text-[11px] leading-snug text-stone">
          Pick a container, then click and hold inside the tank. Gravel dropped in the pool settles
          on its bed; water poured on land starts a pool.
        </p>
        <PourContainersGrid />
      </section>
    </div>
  )
}
