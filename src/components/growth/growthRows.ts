import { findCatalogDef } from '@/data/catalog'
import type { PlacedItem } from '@/data/types'
import { CYCLE_DAYS } from '@/engine/care'
import { hasPool } from '@/engine/geometry'
import { BREED, type BreedConditions } from '@/engine/simulation/breed'
import {
  PUMP_OFF_CYCLE_FACTOR,
  SPROUT_RATE,
  SPROUT_START,
  sproutScale,
} from '@/engine/simulation/dayTick'
import { itemStress } from '@/engine/simulation/ecology'
import { LIFE, lifePace } from '@/engine/simulation/life'
import { mossCover } from '@/engine/simulation/moss'
import { paceMs, type PaceId } from '@/engine/simulation/pace'
import { PHASES, phaseAt } from '@/engine/simulation/phases'
import { etaLabel } from '@/engine/simulation/report'
import type { EngineWorld } from '@/engine/world'
import type { StudioState } from '@/store/studio'

export type HealthChip = { label: string; tone: 'good' | 'fair' | 'bad' | 'rest' }

export interface FloraRow {
  uid: string
  name: string
  chip: HealthChip
  /** Size as a percentage of the species' full size (0 to 100). */
  size: number
  phase: string
  /** Progress through the current phase or cycle, 0 to 1. */
  bar: number
  /** Phase boundaries (below 1) to mark on the bar. */
  ticks: number[]
  next: string
  /** Tank days until `next` happens; absent when nothing is coming. */
  eta?: number
}

export interface FaunaRow {
  id: string
  name: string
  count: number
  uids: string[]
  chip: { label: 'Stressed' | 'Calm'; tone: 'bad' | 'good' }
  /** Mean growing-up progress of the babies, as a percentage. */
  young?: number
  breeding?: { n: number; cap: number }
  next: string
  /** Tank days until the next young; absent otherwise. */
  eta?: number
}

/** Mean stress at or above which a species is flagged (and stops breeding). */
const STRESSED_AT = 0.4
const MAX_RUNNERS = 4
/** Plants grow to at most this much of their base scale. */
const FULL_SIZE = 1.35

const nameOf = (id: string): string => findCatalogDef(id)?.name ?? id
const capitalise = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1)
const lowerFirst = (s: string): string => s.charAt(0).toLowerCase() + s.slice(1)

export function healthChip(item: PlacedItem): HealthChip {
  if (item.resting) return { label: 'Resting', tone: 'rest' }
  const v = item.vitality ?? 100
  if (v > 85) return { label: 'Thriving', tone: 'good' }
  if (v > 70) return { label: 'Healthy', tone: 'good' }
  if (v > 55) return { label: 'Slowed', tone: 'fair' }
  return { label: 'Struggling', tone: 'bad' }
}

function sizeOf(item: PlacedItem): number {
  const base = findCatalogDef(item.id)?.baseScale ?? item.scale
  const scale = item.stage === 'sprout' ? sproutScale(item, base) : item.scale
  return Math.min(100, Math.round((scale / (base * FULL_SIZE)) * 100))
}

/** One plant: where it is in its life, how healthy it is and what happens next. `dose` is the light a bloom gets. */
export function floraRow(item: PlacedItem, dose: number, pace: PaceId): FloraRow {
  const msPerDay = paceMs(pace)
  const row = { uid: item.uid, name: nameOf(item.id), chip: healthChip(item), size: sizeOf(item) }

  if (item.stage === 'sprout') {
    const gp = item.growthProgress ?? SPROUT_START
    const eta = Math.max(0, 1 - gp) / SPROUT_RATE
    return {
      ...row,
      phase: item.born ? 'Seedling' : 'Sprout',
      bar: Math.min(1, Math.max(0, (gp - SPROUT_START) / (1 - SPROUT_START))),
      ticks: [],
      next: `Fills out ${etaLabel(eta, msPerDay)}`,
      eta,
    }
  }

  const def = LIFE[item.id]
  const life = item.life
  if (!def || !life) {
    return { ...row, phase: 'Mature', bar: 1, ticks: [], next: 'Settled in' }
  }

  // A plant left at exactly the cycle end (a catch-up nudge) is at the start of its next cycle.
  const cyc = life.cyc % 1
  const phase = phaseAt(def.kind, cyc)
  const phaseName =
    def.kind === 'shoot' ? `${phase.name} · ${life.tendrils} of ${MAX_RUNNERS} runners` : phase.name
  const shared = {
    ...row,
    phase: phaseName,
    bar: Math.min(1, Math.max(0, cyc)),
    ticks: PHASES[def.kind].map((p) => p.to).filter((t) => t < 1),
  }
  if (item.resting) return { ...shared, next: 'Paused. Mist or water to wake it' }
  const speed = lifePace(item, dose)
  if (speed <= 0) return { ...shared, next: 'Paused until it recovers' }
  const eta = (Math.max(0, phase.to - cyc) * def.days) / speed
  return {
    ...shared,
    next: `${capitalise(phase.next)} ${etaLabel(eta, msPerDay)}${speed < 1 ? ' (slowed)' : ''}`,
    eta,
  }
}

const mean = (values: number[]): number =>
  values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length

/** Animals grouped by species, in the order they were first placed. */
export function faunaRows(world: EngineWorld, cond: BreedConditions, pace: PaceId): FaunaRow[] {
  const msPerDay = paceMs(pace)
  const groups = new Map<string, PlacedItem[]>()
  for (const item of world.items) {
    if (item.category !== 'fauna') continue
    const list = groups.get(item.id)
    if (list) list.push(item)
    else groups.set(item.id, [item])
  }

  const rows: FaunaRow[] = []
  for (const [id, members] of groups) {
    const adults = members.filter((m) => m.baby === undefined)
    const babies = members.filter((m) => m.baby !== undefined)
    const stress = mean((adults.length > 0 ? adults : members).map((m) => itemStress(m, world.env)))
    const stressed = stress >= STRESSED_AT
    const row: FaunaRow = {
      id,
      name: nameOf(id),
      count: members.length,
      uids: members.map((m) => m.uid),
      chip: stressed ? { label: 'Stressed', tone: 'bad' } : { label: 'Calm', tone: 'good' },
      next: 'Does not breed in this tank',
    }
    if (babies.length > 0) {
      row.young = Math.round(mean(babies.map((b) => Math.min(1, b.baby ?? 0))) * 100)
    }
    const def = BREED[id]
    if (def) {
      row.breeding = { n: members.length, cap: def.cap }
      const needs = def.needs(cond)
      if (members.length >= def.cap) {
        row.next = 'Colony is full. Numbers hold steady'
      } else if (needs !== null) {
        row.next = `Waiting for ${needs}`
      } else if (adults.length === 0) {
        row.next = 'Waiting for the young to grow up'
      } else if (stressed) {
        row.next = 'Waiting until they settle down'
      } else {
        const eta = Math.max(0, 1 - (world.breed[id] ?? 0)) * def.days
        row.eta = eta
        row.next = `Next young ${etaLabel(eta, msPerDay)}`
      }
    }
    rows.push(row)
  }
  return rows
}

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`

export interface TankStats {
  age: string
  pool?: { value: string; sub: string }
  moss: { value: string; sub: string }
}

/** The three stat tiles at the top of the board. */
export function tankStats(
  world: EngineWorld,
  state: Pick<StudioState, 'dayCount' | 'pumpFlow' | 'waterSplit' | 'pace'>,
): TankStats {
  const stats: TankStats = {
    age: `Day ${Math.floor(state.dayCount)}`,
    moss: {
      value: `${mossCover(world.mossTufts)}%`,
      sub: plural(world.mossTufts.length, 'patch', 'patches'),
    },
  }
  if (hasPool(state.waterSplit)) {
    const cp = world.env.cycleProgress
    if (cp >= 1) {
      stats.pool = { value: 'Cycled', sub: 'Filter bacteria are established' }
    } else {
      const days =
        (1 - cp) * CYCLE_DAYS * (state.pumpFlow === 'off' ? 1 / PUMP_OFF_CYCLE_FACTOR : 1)
      stats.pool = {
        value: `${Math.round(cp * 100)}%`,
        sub: `Done ${etaLabel(days, paceMs(state.pace))}`,
      }
    }
  }
  return stats
}

/** The row with the soonest event, as the "Up next" line (`next` lowercased), or null when nothing is due. */
export function upNext(rows: (FloraRow | FaunaRow)[]): { name: string; next: string } | null {
  let best: FloraRow | FaunaRow | null = null
  for (const row of rows) {
    if (row.eta === undefined) continue
    if (!best || row.eta < (best.eta ?? Infinity)) best = row
  }
  return best ? { name: best.name, next: lowerFirst(best.next) } : null
}
