import { useAtomValue } from 'jotai'
import { AccountChip } from '@/components/account/AccountChip'
import { Button } from '@/components/ui/button'
import { LineIcon } from '@/components/ui/LineIcon'
import { startAudioFromGesture, stopAudio } from '@/services/audio'
import { exportSnapshotPng, snapshotFilename } from '@/lib/snapshot'
import { getTerrariumCanvas } from '@/lib/terrariumCanvas'
import { appStore } from '@/store/appStore'
import { growthBoardOpenAtom, openGrowthBoardAtom } from '@/store/overlay'
import { audioEnabledAtom, dayCountAtom, relaxModeAtom } from '@/store/studio'
import { showToast } from '@/store/toast'
import { MoreMenu } from './MoreMenu'

const enterRelax = () => {
  appStore.set(relaxModeAtom, true)
  startAudioFromGesture()
}
const toggleAudio = () => {
  // Starting must happen inside this click (gesture); stopping must not create an AudioContext.
  if (appStore.get(audioEnabledAtom)) stopAudio()
  else startAudioFromGesture()
}
const takeSnapshot = async () => {
  const canvas = getTerrariumCanvas()
  if (!canvas) return
  const ok = await exportSnapshotPng(canvas, snapshotFilename(appStore.get(dayCountAtom)))
  if (ok) showToast('Snapshot saved')
}

export function UtilityActions() {
  const audioEnabled = useAtomValue(audioEnabledAtom)
  const growthOpen = useAtomValue(growthBoardOpenAtom)
  const toggleGrowth = () => {
    if (appStore.get(growthBoardOpenAtom)) appStore.set(growthBoardOpenAtom, false)
    else appStore.set(openGrowthBoardAtom)
  }

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
