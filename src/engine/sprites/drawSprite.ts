import type { CatalogId } from '@/data/catalog'
import { FAUNA_SPRITES, type DrawFn } from './fauna'
import { FAUNA_EXTRA_SPRITES, MILLIPEDE_CURL_SPRITE } from './faunaExtra'
import { FLORA_SPRITES } from './flora'
import { HARDSCAPE_SPRITES } from './hardscape'

/** Prototype sprites are authored on a 128-unit design grid centred at (64, 64). */
const DESIGN_SIZE = 128

/** Pose sprites that are not catalog items (drawn in place of one while it rests). */
export type PoseSpriteId = 'bumblebee_millipede_curl'
export type SpriteId = CatalogId | PoseSpriteId

const SPRITES: Partial<Record<SpriteId, DrawFn>> = {
  ...HARDSCAPE_SPRITES,
  ...FLORA_SPRITES,
  ...FAUNA_SPRITES,
  ...FAUNA_EXTRA_SPRITES,
  bumblebee_millipede_curl: MILLIPEDE_CURL_SPRITE,
}

function drawFallback(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#84cc16'
  ctx.beginPath()
  ctx.arc(0, 0, 14, 0, Math.PI * 2)
  ctx.fill()
}

/**
 * Pure procedural vector sprite. Draws `id` into a square canvas of `size`
 * pixels (prototype: 256, i.e. a 2x scale of the 128-unit design grid).
 */
export function drawSprite(ctx: CanvasRenderingContext2D, id: SpriteId, size = 256): void {
  const k = size / DESIGN_SIZE
  ctx.save()
  ctx.scale(k, k)
  ctx.translate(DESIGN_SIZE / 2, DESIGN_SIZE / 2)
  ;(SPRITES[id] ?? drawFallback)(ctx)
  ctx.restore()
}
