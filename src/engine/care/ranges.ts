/** Ideal humidity and temperature ranges of the placed species. */
import { findCatalogDef } from '@/data/catalog'
import type { CatalogDef, PlacedItem } from '@/data/types'

export function humRange(d: CatalogDef | null): readonly [number, number] | undefined {
  return d && (d.category === 'flora' || d.category === 'fauna') ? d.idealHumidity : undefined
}

export function tempRange(d: CatalogDef | null): readonly [number, number] | undefined {
  return d && d.category === 'fauna' ? d.idealTemp : undefined
}

export interface IdealRange {
  lo: number
  hi: number
  conflict?: boolean
  names?: { lo: string; hi: string }
}

/** Intersection of every placed species' ideal range; flags a conflict when they don't overlap. */
export function idealRange(items: readonly PlacedItem[], key: 'hum' | 'temp'): IdealRange {
  let lo = -Infinity
  let hi = Infinity
  let any = false
  const names = { lo: '', hi: '' }
  for (const it of items) {
    const d = findCatalogDef(it.id)
    const r = key === 'hum' ? humRange(d) : tempRange(d)
    if (!d || !r) continue
    any = true
    if (r[0] > lo) {
      lo = r[0]
      names.lo = d.name
    }
    if (r[1] < hi) {
      hi = r[1]
      names.hi = d.name
    }
  }
  if (!any) return key === 'hum' ? { lo: 60, hi: 90 } : { lo: 20, hi: 28 }
  if (lo > hi) return { lo: hi, hi: lo, conflict: true, names }
  return { lo, hi }
}
