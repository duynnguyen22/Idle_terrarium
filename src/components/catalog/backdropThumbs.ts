import type { BackdropId } from '@/data/types'
import { paintBackdrop } from '@/engine/render/backdrop'

const THUMB_W = 144
const THUMB_H = 96

/** Painted thumbnails, one per scene, made on first use. */
const thumbs = new Map<BackdropId, string>()

/**
 * Paints a 144x96 thumbnail and returns it as a data URL, or '' when the browser gives no 2D
 * context. `none` shows bare glass with two reflection strokes.
 */
export function paintThumb(id: BackdropId, custom: HTMLImageElement | null, type: string): string {
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

export function sceneThumb(id: BackdropId): string {
  const cached = thumbs.get(id)
  if (cached) return cached
  const url = paintThumb(id, null, 'image/png')
  if (url) thumbs.set(id, url)
  return url
}
