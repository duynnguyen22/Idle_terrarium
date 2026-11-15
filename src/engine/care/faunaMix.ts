import type { CareIssue } from '@/data/care'
import type { EnvModel } from '../room'
import type { CareInputs } from './inputs'

/** Tankmate rules for the research species, taken from keepers' care sheets (prototype v8 faunaMixIssues). */
export function faunaMixIssues(
  s: CareInputs,
  has: (id: string) => boolean,
  water: boolean,
  m: EnvModel,
): CareIssue[] {
  const out: CareIssue[] = []
  const count = (id: string) => s.items.filter((i) => i.id === id).length
  if (has('phantasmal_dart')) dartFrogIssues(out, has, count, water)
  if (count('mourning_gecko') === 1) {
    out.push({
      level: 'info',
      species: ['mourning_gecko'],
      text: 'Mourning geckos live in groups. A single one stays shy; add a second.',
    })
  }
  if (has('nerite_snail')) neriteIssues(out, s, m)
  if (has('amano_shrimp') && has('cherry_shrimp')) {
    out.push({
      level: 'info',
      species: ['amano_shrimp', 'cherry_shrimp'],
      text: 'Amano shrimp grab the food first. Scatter the pinch so the cherry shrimp get some.',
    })
  }
  if (has('bumblebee_millipede') && s.humidity < 70) {
    out.push({
      level: 'warn',
      species: ['bumblebee_millipede'],
      text: 'The air is too dry for the millipedes, so they are nibbling the ferns.',
      action: { id: 'mist', label: 'Mist now' },
    })
  }
  if (has('powder_orange') && has('isopod')) {
    out.push({
      level: 'info',
      species: ['powder_orange', 'isopod'],
      text: 'Powder orange and dairy cow isopods compete for the same leaf litter. Over time one will outnumber the other.',
    })
  }
  return out
}

/** Dart frogs: feeder colony, tree-frog tankmates and a pool for tadpoles. */
function dartFrogIssues(
  out: CareIssue[],
  has: (id: string) => boolean,
  count: (id: string) => number,
  water: boolean,
): void {
  if (!has('springtails') && !has('dwarf_white')) {
    out.push({
      level: 'warn',
      species: ['phantasmal_dart'],
      text: 'Dart frogs snack on springtails and dwarf white isopods between feedings. Add a colony so they can forage.',
    })
  } else if (count('springtails') + count('dwarf_white') <= 2) {
    out.push({
      level: 'info',
      species: ['phantasmal_dart', 'springtails', 'dwarf_white'],
      text: 'The dart frogs are eating the springtails faster than they breed. Add another culture.',
    })
  }
  if (has('tree_frog')) {
    out.push({
      level: 'info',
      species: ['phantasmal_dart', 'tree_frog'],
      text: 'Dart frogs and red-eyed tree frogs are not a proven pairing. Watch for stress, or keep them in separate builds.',
    })
  }
  if (!water) {
    out.push({
      level: 'info',
      species: ['phantasmal_dart'],
      text: 'Male dart frogs carry their tadpoles to water. Without a pool there will be no froglets.',
      action: { id: 'widenPool', label: 'Add a pool' },
    })
  }
}

/** Nerite snails: an open lid and soft or acidic water. */
function neriteIssues(out: CareIssue[], s: CareInputs, m: EnvModel): void {
  if (!s.hasLid) {
    out.push({
      level: 'warn',
      species: ['nerite_snail'],
      text: 'Nerite snails climb out at the waterline and dry out. Seal the lid.',
      action: { id: 'closeLid', label: 'Seal the lid' },
    })
  }
  if (m.ph < 7 || m.tds < 120) {
    out.push({
      level: 'warn',
      species: ['nerite_snail'],
      text: `Soft or acidic water (pH ${m.ph.toFixed(1)}, ${m.tds} ppm) wears holes in nerite shells. They need pH above 7 and harder water.`,
    })
  }
}
