import { useAtomValue } from 'jotai'
import { AccountChip } from '@/components/account/AccountChip'
import { Button } from '@/components/ui/button'
import { LineIcon } from '@/components/ui/LineIcon'
import { appStore } from '@/store/appStore'
import { isHandheldAtom } from '@/store/layout'
import { growthBoardOpenAtom, openGrowthBoardAtom } from '@/store/overlay'
import { audioEnabledAtom } from '@/store/studio'
import { MoreMenu } from './MoreMenu'
import { enterRelax, takeSnapshot, toggleAudio } from './studioActions'

export function UtilityActions() {
  const audioEnabled = useAtomValue(audioEnabledAtom)
  const growthOpen = useAtomValue(growthBoardOpenAtom)
  const handheld = useAtomValue(isHandheldAtom)
  const toggleGrowth = () => {
    if (appStore.get(growthBoardOpenAtom)) appStore.set(growthBoardOpenAtom, false)
    else appStore.set(openGrowthBoardAtom)
  }
  // Handheld: the tab bar and the More menu carry everything else.
  if (handheld) return <MoreMenu />

  return (
    <div className="flex shrink-0 items-center gap-1 lg:gap-1.5">
      <AccountChip />
      <Button
        variant={growthOpen ? 'default' : 'sand'}
        aria-haspopup="dialog"
        aria-expanded={growthOpen}
        aria-controls="growth-board"
        aria-label="Growth"
        title="See how every plant and animal is growing"
        onClick={toggleGrowth}
        className="px-2 text-xs font-semibold lg:px-3"
      >
        <LineIcon name="sprout" />
        <span className="hidden lg:inline">Growth</span>
      </Button>
      <Button
        variant="forest"
        onClick={enterRelax}
        title="Full-screen relax mode (R)"
        className="px-3 text-xs font-semibold"
      >
        <LineIcon name="leaf" />
        <span>Relax</span>
      </Button>
      <Button
        variant="sand"
        size="icon"
        onClick={toggleAudio}
        aria-label="Ambient sound"
        aria-pressed={audioEnabled}
        title="Ambient sound"
      >
        <LineIcon name={audioEnabled ? 'vol' : 'mute'} />
      </Button>
      <Button
        onClick={() => void takeSnapshot()}
        aria-label="Snapshot"
        title="Save a PNG snapshot of the terrarium"
        className="px-3 text-xs font-semibold"
      >
        <LineIcon name="camera" />
        <span className="hidden lg:inline">Snapshot</span>
      </Button>
      <MoreMenu />
    </div>
  )
}
