import type { DecorId } from '@/data/catalog'
import type { DrawFn } from '../fauna'
import { JAPAN_SPRITES } from './japan'
import { LIGHTS_SPRITES } from './lights'
import { PATHS_SPRITES } from './paths'
import { PEOPLE_SPRITES } from './people'
import { PETS_SPRITES } from './pets'
import { VILLAGE_SPRITES } from './village'
import { WILDLIFE_SPRITES } from './wildlife'

export const DECOR_SPRITES: Record<DecorId, DrawFn> = {
  ...VILLAGE_SPRITES,
  ...PATHS_SPRITES,
  ...JAPAN_SPRITES,
  ...PEOPLE_SPRITES,
  ...WILDLIFE_SPRITES,
  ...PETS_SPRITES,
  ...LIGHTS_SPRITES,
}
