import { useId, useMemo, useRef, useSyncExternalStore, type ChangeEvent } from 'react'
import { useAtom } from 'jotai'
import { Button } from '@/components/ui/button'
import { LineIcon } from '@/components/ui/LineIcon'
import { Slider } from '@/components/ui/slider'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { BACKDROPS } from '@/data/backdrops'
import type { BackdropId } from '@/data/types'
import { paintBackdrop } from '@/engine/render/backdrop'
import {
  clearCustomBackdrop,
  getCustomBackdrop,
  setCustomBackdropFromFile,
  subscribeCustomBackdrop,
} from '@/lib/backdropPhoto'
import { MAX_BACKDROP_HAZE } from '@/store/migrations'
import { backdropAtom, backdropHazeAtom } from '@/store/studio'
import { showToast } from '@/store/toast'

const THUMB_W = 144
const THUMB_H = 96

/** Painted thumbnails, one per scene, made on first use. */
const thumbs = new Map<BackdropId, string>()

/**
 * Paints a 144x96 thumbnail and returns it as a data URL, or '' when the browser gives no 2D
 * context. `none` shows bare glass with two reflection strokes.
 */
function paintThumb(id: BackdropId, custom: HTMLImageElement | null, type: string): string {
  const c = document.createElement('canvas')
  c.width = THUMB_W
  c.height = THUMB_H
  const g = c.getContext('2d')
  if (!g) return ''
  if (id === 'none') {
    g.fillStyle = '#eef2ec'
    g.fillRect(0, 0, THUMB_W, THUMB_H)
    g.strokeStyle = 'rgba(27, 59, 43, 0.25)'
    g.lineWidth = 2
    g.beginPath()
    g.moveTo(96, 8)
    g.lineTo(70, 88)
    g.moveTo(112, 8)
    g.lineTo(86, 88)
    g.stroke()
  } else {
    paintBackdrop(g, id, THUMB_W, THUMB_H, custom)
  }
  return c.toDataURL(type, 0.8)
}

function sceneThumb(id: BackdropId): string {
  const cached = thumbs.get(id)
  if (cached) return cached
  const url = paintThumb(id, null, 'image/png')
  if (url) thumbs.set(id, url)
  return url
}

const IMG = 'block aspect-[3/2] w-full rounded-[7px] bg-cover bg-center'
const PHOTO_LINK = 'p-0 text-[11px] font-semibold'

/** "Miniature landscape backdrop" section of the Vessel tab: scene grid, photo upload and removal, depth haze. */
export function BackdropSection() {
  const [backdrop, setBackdrop] = useAtom(backdropAtom)
  const [haze, setBackdropHaze] = useAtom(backdropHazeAtom)
  const photo = useSyncExternalStore(subscribeCustomBackdrop, getCustomBackdrop)
  const fileRef = useRef<HTMLInputElement>(null)
  const hazeId = useId()

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
        {photo && (
          <span className="flex shrink-0 items-center gap-2.5">
            <Button
              variant="link"
              size="auto"
              onClick={openFilePicker}
              className={`${PHOTO_LINK} text-forest-mid`}
            >
              Change photo
            </Button>
            <Button
              variant="link"
              size="auto"
              onClick={removePhoto}
              className={`${PHOTO_LINK} text-stone hover:text-ink-soft`}
            >
              Remove photo
            </Button>
          </span>
        )}
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
        {BACKDROPS.map((b) => {
          const thumb = b.id === 'custom' ? photoThumb : sceneThumb(b.id)
          const upload = b.id === 'custom' && !photo
          return (
            <ToggleGroupItem
              key={b.id}
              value={b.id}
              aria-label={b.name}
              className="min-w-0 text-forest-ink hover:text-forest-ink"
            >
              {upload ? (
                <span
                  className={`${IMG} flex flex-col items-center justify-center gap-0.5 bg-[#eef1ea] text-[10px] font-semibold text-[#2d5a43]`}
                >
                  <LineIcon name="camera" />
                  <span>Upload</span>
                </span>
              ) : (
                <span
                  className={IMG}
                  style={thumb ? { backgroundImage: `url('${thumb}')` } : undefined}
                />
              )}
              <span className="truncate px-0.5 pb-0.5 text-[10.5px] leading-tight font-semibold">
                {b.name}
              </span>
            </ToggleGroupItem>
          )
        })}
      </ToggleGroup>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        aria-label="Backdrop photo"
        className="hidden"
        onChange={onFile}
      />
      {backdrop !== 'none' && (
        <div className="mt-2.5 flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs">
            <span id={hazeId} className="font-medium text-ink-soft">
              Depth haze
            </span>
            <span className="text-[11px] text-stone tabular-nums">{haze}%</span>
          </div>
          <Slider
            aria-labelledby={hazeId}
            min={0}
            max={MAX_BACKDROP_HAZE}
            value={[haze]}
            onValueChange={([v]) => setBackdropHaze(v!)}
          />
          <p className="text-[10.5px] text-stone">
            More haze pushes the scene further back behind your plants.
          </p>
        </div>
      )}
    </section>
  )
}
