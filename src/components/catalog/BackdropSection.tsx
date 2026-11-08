import { useId, useMemo, useRef, useSyncExternalStore, type ChangeEvent } from 'react'
import { BACKDROPS } from '@/data/backdrops'
import type { BackdropId } from '@/data/types'
import { paintBackdrop } from '@/engine/render/backdrop'
import {
  getCustomBackdrop,
  setCustomBackdropFromFile,
  subscribeCustomBackdrop,
} from '@/lib/backdropPhoto'
import { MAX_BACKDROP_HAZE } from '@/store/migrations'
import { showToast } from '@/store/toastStore'
import { useStudioStore } from '@/store/useStudioStore'
import { LineIcon } from '../ui/LineIcon'

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

/** "Miniature landscape backdrop" section of the Vessel tab: scene grid, photo upload, depth haze. */
export function BackdropSection() {
  const backdrop = useStudioStore((s) => s.backdrop)
  const haze = useStudioStore((s) => s.backdropHaze)
  const setBackdrop = useStudioStore((s) => s.setBackdrop)
  const setBackdropHaze = useStudioStore((s) => s.setBackdropHaze)
  const photo = useSyncExternalStore(subscribeCustomBackdrop, getCustomBackdrop)
  const fileRef = useRef<HTMLInputElement>(null)
  const hazeId = useId()

  const photoThumb = useMemo(
    () => (photo ? paintThumb('custom', photo, 'image/jpeg') : ''),
    [photo],
  )
  const openFilePicker = () => fileRef.current?.click()

  const choose = (id: BackdropId) => {
    if (id === 'custom' && !photo) {
      openFilePicker()
      return
    }
    setBackdrop(id)
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
          <button
            type="button"
            onClick={openFilePicker}
            className="text-[11px] font-semibold text-forest-mid hover:underline"
          >
            Change photo
          </button>
        )}
      </div>
      <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Backdrop">
        {BACKDROPS.map((b) => {
          const thumb = b.id === 'custom' ? photoThumb : sceneThumb(b.id)
          const upload = b.id === 'custom' && !photo
          return (
            <button
              key={b.id}
              type="button"
              role="radio"
              aria-checked={backdrop === b.id}
              aria-label={b.name}
              onClick={() => choose(b.id)}
              className="bd-tile"
            >
              {upload ? (
                <span className="bd-img bd-upload">
                  <LineIcon name="camera" />
                  <span>Upload</span>
                </span>
              ) : (
                <span
                  className="bd-img"
                  style={thumb ? { backgroundImage: `url('${thumb}')` } : undefined}
                />
              )}
              <span className="bd-name">{b.name}</span>
            </button>
          )
        })}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        aria-label="Backdrop photo"
        className="hidden"
        onChange={onFile}
      />
      {backdrop !== 'none' && (
        <div className="mt-2.5 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor={hazeId} className="font-medium text-ink-soft">
              Depth haze
            </label>
            <span className="tabular-nums text-[11px] text-stone">{haze}%</span>
          </div>
          <input
            id={hazeId}
            type="range"
            min={0}
            max={MAX_BACKDROP_HAZE}
            value={haze}
            onChange={(e) => setBackdropHaze(Number(e.target.value))}
            className="w-full"
          />
          <p className="text-[10.5px] text-stone">
            More haze pushes the scene further back behind your plants.
          </p>
        </div>
      )}
    </section>
  )
}
