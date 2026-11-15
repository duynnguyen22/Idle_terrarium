/**
 * Procedural miniature landscapes for the back glass (prototype-v7 paintBackdrop). Every scene is
 * drawn from a fixed seed, so the same id and size always paint the same picture.
 */

import type { BackdropId } from '@/data/types'
import { paintAlpine } from './alpine'
import { paintCustom } from './custom'
import { paintFalls } from './falls'
import { paintKarst } from './karst'
import { paintMesa } from './mesa'
import { paintPines } from './pines'
import { seededRandom } from './random'
import { paintTerraces } from './terraces'
import type { Painter } from './types'

export { seededRandom } from './random'
export { ridgeY, skyGradient } from './skyAndRidge'

const PAINTERS: Partial<Record<BackdropId, Painter>> = {
  karst: paintKarst,
  terraces: paintTerraces,
  pines: paintPines,
  alpine: paintAlpine,
  falls: paintFalls,
  mesa: paintMesa,
}

/**
 * Paints backdrop `id` into a `w x h` area of `g` (cleared first). `none` paints nothing; `custom`
 * paints `custom` when it has loaded.
 */
export function paintBackdrop(
  g: CanvasRenderingContext2D,
  id: BackdropId,
  w: number,
  h: number,
  custom?: HTMLImageElement | null,
): void {
  const rnd = seededRandom(1234 + id.length * 97)
  g.save()
  g.clearRect(0, 0, w, h)
  if (id === 'custom') paintCustom(g, w, h, custom)
  else PAINTERS[id]?.(g, w, h, rnd)
  g.restore()
}
