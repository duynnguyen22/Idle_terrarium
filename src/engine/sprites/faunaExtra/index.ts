import type { DrawFn } from '../fauna'
import { drawFaunaDartFrog, drawFaunaMourningGecko } from './frogsAndGeckos'
import { drawFaunaDwarfWhite, drawFaunaPowderIsopod } from './isopods'
import { drawFaunaMillipede, drawFaunaMillipedeCurled } from './millipedes'
import { drawFaunaAmano } from './shrimp'
import { drawFaunaNerite, drawFaunaRamshorn } from './snails'

/* New fauna from the paludarium fauna research (prototype v8). */

/** Sprites of the eight research species, keyed by catalog id. */
export const FAUNA_EXTRA_SPRITES = {
  powder_orange: drawFaunaPowderIsopod,
  dwarf_white: drawFaunaDwarfWhite,
  bumblebee_millipede: drawFaunaMillipede,
  phantasmal_dart: drawFaunaDartFrog,
  mourning_gecko: drawFaunaMourningGecko,
  nerite_snail: drawFaunaNerite,
  ramshorn_snail: drawFaunaRamshorn,
  amano_shrimp: drawFaunaAmano,
} as const satisfies Record<string, DrawFn>

/** The millipede coiled up by day; drawn in place of the walking sprite while it hides. */
export const MILLIPEDE_CURL_SPRITE: DrawFn = drawFaunaMillipedeCurled
