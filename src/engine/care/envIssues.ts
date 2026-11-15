/** Care issues that come from the room: water chemistry, air quality and glass residue. */
import { findCatalogDef } from '@/data/catalog'
import type { CareIssue } from '@/data/care'
import type { RoomEnv } from '@/data/types'
import type { EnvModel } from '../room'

/** Display names of the listed species that are in the build. */
type SpeciesNames = (ids: string[]) => string[]

/** Water chemistry, air quality and glass residue issues from the room (prototype 3898-3921). */
export function envCareIssues(
  m: EnvModel,
  room: RoomEnv,
  hasLid: boolean,
  mineralSpots: number,
  has: (id: string) => boolean,
): CareIssue[] {
  const out: CareIssue[] = []
  const names = (ids: string[]) => ids.filter(has).map((i) => findCatalogDef(i)?.name ?? i)
  waterIssues(out, m, room, has, names)
  airIssues(out, m, room, hasLid, has, names)
  if (mineralSpots > 0.35) {
    out.push({
      level: 'info',
      text: 'Mineral spots are clouding the glass.',
      action: { id: 'wipeGlass', label: 'Wipe the glass' },
    })
  }
  return out
}

/** Chlorine, hardness, pH and polluted rain, in that order. */
function waterIssues(
  out: CareIssue[],
  m: EnvModel,
  room: RoomEnv,
  has: (id: string) => boolean,
  names: SpeciesNames,
): void {
  if (m.chlorine >= 0.9) {
    const hit = names([
      'cherry_shrimp',
      'medaka_fish',
      'tree_frog',
      'vampire_crab',
      'amano_shrimp',
      'phantasmal_dart',
      'nerite_snail',
    ])
    out.push({
      level: 'warn',
      text: `Untreated tap water carries chlorine${hit.length ? `, which harms ${hit.join(', ')}` : ' that burns moss tips'}.`,
      action: { id: 'waterTreat', label: 'Add dechlorinator' },
    })
  } else if (m.chlorine > 0 && has('cherry_shrimp')) {
    out.push({
      level: 'info',
      text: 'Carbon filters leave some chloramine. Shrimp are sensitive; a dechlorinator removes the rest.',
      action: { id: 'waterTreat', label: 'Use dechlorinator' },
    })
  }
  if (m.tds > 350) {
    out.push({
      level: 'warn',
      text: `Hard water (${m.tds} ppm) leaves white mineral crust on leaves and glass. Mist with RO or rainwater.`,
      action: { id: 'waterRO', label: 'Switch to RO water' },
    })
  }
  if (m.tds < 80 && (has('cherry_shrimp') || has('garden_snail'))) {
    out.push({
      level: 'info',
      text: `Water this soft (${m.tds} ppm) lacks the calcium shrimp and snails need for shells. Remineralise to 150–250 ppm.`,
    })
  }
  if (Math.abs(m.ph - 7) > 1) {
    out.push({
      level: 'warn',
      text: `pH ${m.ph.toFixed(1)} is far from neutral. Most of these species do best between 6.5 and 7.5.`,
    })
  }
  if (room.water === 'rain' && m.airRaw < 60) {
    out.push({
      level: 'info',
      text: 'Rain collected in polluted air picks up soot and acids. Use RO water until the air clears.',
    })
  }
}

/** At most one air issue: toxic sprays, then fumes, then dust and soot. */
function airIssues(
  out: CareIssue[],
  m: EnvModel,
  room: RoomEnv,
  hasLid: boolean,
  has: (id: string) => boolean,
  names: SpeciesNames,
): void {
  if (m.kind === 'toxic') {
    const inv = names([
      'isopod',
      'ducky_isopod',
      'springtails',
      'cherry_shrimp',
      'garden_snail',
      'vampire_crab',
      'powder_orange',
      'dwarf_white',
      'bumblebee_millipede',
      'amano_shrimp',
    ])
    out.push({
      level: 'warn',
      text: `Insecticide and fragrance sprays kill invertebrates${inv.length ? ` like ${inv.join(', ')}` : ''}. Keep sprays out of this room.`,
      action: { id: 'airClean', label: 'Move the tank' },
    })
  } else if (m.kind === 'fumes') {
    out.push({
      level: 'warn',
      text: `Paint and new-furniture fumes${has('tree_frog') ? ' pass through frog skin' : ' stress plants and animals'}. Ventilate the room and keep the lid sealed.`,
      ...(hasLid ? {} : { action: { id: 'closeLid', label: 'Seal the lid' } }),
    })
  } else if (m.kind === 'particles' && m.airEff < 70) {
    const action: CareIssue['action'] = room.purifier
      ? hasLid
        ? undefined
        : { id: 'closeLid', label: 'Seal the lid' }
      : { id: 'purifierOn', label: 'Run the air purifier' }
    out.push({
      level: 'info',
      text: 'Dust and soot settle on leaves and slow photosynthesis.',
      ...(action ? { action } : {}),
    })
  }
}
