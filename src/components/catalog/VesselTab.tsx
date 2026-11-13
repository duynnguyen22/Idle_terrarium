import { useId } from 'react'
import { useAtomValue, useSetAtom } from 'jotai'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { mutateWorld } from '@/engine/engineBridge'
import { toggleHardwareAtom, hasLidAtom } from '@/store/studio'
import { showToast } from '@/store/toast'
import { BackdropSection } from './BackdropSection'
import { BiomeRecipes } from './BiomeRecipes'
import { HardwarePanel } from './HardwarePanel'
import { PourContainersGrid } from './PourContainersGrid'
import { SubstrateSliders, TotalSubstrateDepth } from './SubstrateSliders'
import { VesselGrid } from './VesselGrid'

const H2 = 'text-xs font-semibold text-forest-deep'

export function VesselTab() {
  const hasLid = useAtomValue(hasLidAtom)
  const toggleHardware = useSetAtom(toggleHardwareAtom)
  const lidId = useId()

  const levelTerrain = () => {
    mutateWorld((w) => {
      w.terrainContour = new Array<number>(w.terrainContour.length).fill(0)
      w.surfaceGrains = []
    })
    showToast('Terrain levelled and loose grains cleared')
  }

  return (
    <div className="flex flex-col gap-6">
      <section>
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className={H2}>Enclosure</h2>
          <div className="flex items-center gap-1.5">
            <Checkbox
              id={lidId}
              checked={hasLid}
              onCheckedChange={() => toggleHardware('hasLid')}
              className="size-3.5"
            />
            <Label htmlFor={lidId} className="cursor-pointer text-xs text-forest-deep">
              Lid sealed
            </Label>
          </div>
        </div>
        <VesselGrid />
        <HardwarePanel />
      </section>

      <BackdropSection />

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
          <Button
            variant="link"
            size="auto"
            onClick={levelTerrain}
            className="p-0 text-[11px] font-semibold text-forest-mid"
          >
            Level terrain
          </Button>
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
