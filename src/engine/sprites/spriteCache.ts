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

export function getSpriteDataUrl(id: CatalogId): string {
  const cached = dataUrls.get(id)
  if (cached !== undefined) return cached
  const url = getSprite(id).toDataURL('image/png')
  dataUrls.set(id, url)
  return url
}
