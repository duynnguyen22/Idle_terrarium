import type { CatalogId } from '@/data/catalog'
import { drawSprite } from './drawSprite'

export const SPRITE_SIZE = 256

export type CreateCanvas = () => HTMLCanvasElement

const defaultCreateCanvas: CreateCanvas = () => document.createElement('canvas')

let createCanvas: CreateCanvas = defaultCreateCanvas
const canvases = new Map<CatalogId, HTMLCanvasElement>()
const dataUrls = new Map<CatalogId, string>()

/** Swap the canvas factory (tests) and clear all memoized sprites. Call with no argument to restore the default. */
export function configureSpriteCache(factory: CreateCanvas = defaultCreateCanvas): void {
  createCanvas = factory
  canvases.clear()
  dataUrls.clear()
}

export function getSprite(id: CatalogId): HTMLCanvasElement {
  const cached = canvases.get(id)
  if (cached) return cached
  const canvas = createCanvas()
  canvas.width = SPRITE_SIZE
  canvas.height = SPRITE_SIZE
  const ctx = canvas.getContext('2d')
  if (ctx) drawSprite(ctx, id, SPRITE_SIZE)
  canvases.set(id, canvas)
  return canvas
}

export function warmSpriteCache(ids: readonly CatalogId[]): void {
  for (const id of ids) getSprite(id)
}

/** Catalog thumbnails are square PNGs of this many pixels. */
export const THUMB_SIZE = 192

export type ThumbnailFrame = { scale: number; cx: number; cy: number }

/**
 * How to frame a sprite so its drawn pixels fill a THUMB_SIZE square with a 12% margin.
 * `rgba` is the sprite's ImageData buffer; pixels with alpha above 8 count as drawn.
 * Returns null for an empty sprite.
 */
export function thumbnailFrame(
  rgba: ArrayLike<number>,
  width: number,
  height: number,
  out = THUMB_SIZE,
): ThumbnailFrame | null {
  let x0 = width
  let y0 = height
  let x1 = -1
  let y1 = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if ((rgba[(y * width + x) * 4 + 3] ?? 0) > 8) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
    }
  }
  if (x1 < 0) return null
  const side = Math.max(x1 - x0, y1 - y0) + 1
  const pad = Math.round(side * 0.12)
  return { scale: out / (side + pad * 2), cx: (x0 + x1 + 1) / 2, cy: (y0 + y1 + 1) / 2 }
}

function renderThumbnail(id: CatalogId): string {
  const sprite = getSprite(id)
  const data = sprite.getContext('2d')?.getImageData?.(0, 0, sprite.width, sprite.height)?.data
  const frame = data ? thumbnailFrame(data, sprite.width, sprite.height) : null
  if (!frame) return sprite.toDataURL('image/png')
  const thumb = createCanvas()
  thumb.width = THUMB_SIZE
  thumb.height = THUMB_SIZE
  const ctx = thumb.getContext('2d')
  if (!ctx) return sprite.toDataURL('image/png')
  ctx.imageSmoothingQuality = 'high'
  // Redraw the vector rather than scaling pixels, so small creatures stay sharp.
  ctx.translate(THUMB_SIZE / 2, THUMB_SIZE / 2)
  ctx.scale(frame.scale, frame.scale)
  ctx.translate(-frame.cx, -frame.cy)
  drawSprite(ctx, id, SPRITE_SIZE)
  return thumb.toDataURL('image/png')
}

/** Memoized PNG data URL of a catalog thumbnail: the sprite cropped to its drawn pixels. */
export function getSpriteDataUrl(id: CatalogId): string {
  const cached = dataUrls.get(id)
  if (cached !== undefined) return cached
  const url = renderThumbnail(id)
  dataUrls.set(id, url)
  return url
}
