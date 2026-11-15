import type { CatalogDef } from '../types'
import { FAUNA } from './fauna'
import { FLORA } from './flora'
import { HARDSCAPE } from './hardscape'

export { FAUNA, FAUNA_BY_ID, FAUNA_GROUPS, type FaunaId } from './fauna'
export { FLORA } from './flora'
export { HARDSCAPE } from './hardscape'

export const CATALOG = { flora: FLORA, hardscape: HARDSCAPE, fauna: FAUNA } as const

export const ALL_CATALOG_DEFS: readonly CatalogDef[] = [...FLORA, ...HARDSCAPE, ...FAUNA]

export type CatalogId = (typeof ALL_CATALOG_DEFS)[number]['id']

const DEFS_BY_ID = new Map<string, CatalogDef>(ALL_CATALOG_DEFS.map((d) => [d.id, d]))

export function findCatalogDef(id: string): CatalogDef | null {
  return DEFS_BY_ID.get(id) ?? null
}
