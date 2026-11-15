import { useMemo, useRef, useSyncExternalStore, type ChangeEvent } from 'react'
import { useAtom } from 'jotai'
import { ToggleGroup } from '@/components/ui/toggle-group'
import { BACKDROPS } from '@/data/backdrops'
import type { BackdropId } from '@/data/types'
import {
  clearCustomBackdrop,
  getCustomBackdrop,
  setCustomBackdropFromFile,
  subscribeCustomBackdrop,
} from '@/lib/backdropPhoto'
import { backdropAtom } from '@/store/studio'
import { showToast } from '@/store/toast'
import { BackdropHazeControl } from './BackdropHazeControl'
import { BackdropPhotoLinks } from './BackdropPhotoLinks'
import { BackdropTile } from './BackdropTile'
import { paintThumb, sceneThumb } from './backdropThumbs'

/** "Miniature landscape backdrop" section of the Vessel tab: scene grid, photo upload and removal, depth haze. */
export function BackdropSection() {
  const [backdrop, setBackdrop] = useAtom(backdropAtom)
  const photo = useSyncExternalStore(subscribeCustomBackdrop, getCustomBackdrop)
  const fileRef = useRef<HTMLInputElement>(null)

  const photoThumb = useMemo(
    () => (photo ? paintThumb('custom', photo, 'image/jpeg') : ''),
    [photo],
  )
  const openFilePicker = () => fileRef.current?.click()

  // ToggleGroup sends '' when the chosen tile is pressed again; arrow keys only move focus.
  const choose = (next: string) => {
    if (!next) return
    const id = next as BackdropId
    if (id === 'custom' && !photo) {
      openFilePicker()
      return
    }
    setBackdrop(id)
  }

  const removePhoto = () => {
    clearCustomBackdrop()
    if (backdrop === 'custom') setBackdrop('none')
    showToast('Photo removed')
  }

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setCustomBackdropFromFile(file).then(
      ({ toast }) => {
        setBackdrop('custom')
        showToast(toast)
      },
      (err: unknown) => showToast(err instanceof Error ? err.message : String(err)),
    )
  }

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold text-forest-deep">Miniature landscape backdrop</h2>
        {photo && <BackdropPhotoLinks onChange={openFilePicker} onRemove={removePhoto} />}
      </div>
      <ToggleGroup
        type="single"
        variant="tile"
        size="auto"
        spacing={1.5}
        aria-label="Backdrop"
        value={backdrop}
        onValueChange={choose}
        className="grid w-full grid-cols-4"
      >
        {BACKDROPS.map((b) => (
          <BackdropTile
            key={b.id}
            id={b.id}
            name={b.name}
            thumb={b.id === 'custom' ? photoThumb : sceneThumb(b.id)}
            upload={b.id === 'custom' && !photo}
          />
        ))}
      </ToggleGroup>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        aria-label="Backdrop photo"
        className="hidden"
        onChange={onFile}
      />
      {backdrop !== 'none' && <BackdropHazeControl />}
    </section>
  )
}
