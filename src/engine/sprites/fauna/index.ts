import type { CatalogId } from '@/data/catalog'
import { drawFaunaTreeFrog } from './amphibians'
import { drawFaunaCherryShrimp, drawFaunaIsopod, drawFaunaVampireCrab } from './crustaceans'
import { drawFaunaMedaka } from './fish'
import { drawFaunaSnail } from './molluscs'
import type { DrawFn } from './shapes'
import { drawFaunaSpringtails } from './springtails'

export { fillShape, strokeShape, type Ctx, type DrawFn } from './shapes'

export const FAUNA_SPRITES: Partial<Record<CatalogId, DrawFn>> = {
  tree_frog: drawFaunaTreeFrog,
  vampire_crab: drawFaunaVampireCrab,
  medaka_fish: drawFaunaMedaka,
  cherry_shrimp: drawFaunaCherryShrimp,
  isopod: (ctx) => drawFaunaIsopod(ctx, 'dairy'),
  ducky_isopod: (ctx) => drawFaunaIsopod(ctx, 'ducky'),
  springtails: drawFaunaSpringtails,
  garden_snail: drawFaunaSnail,
}
