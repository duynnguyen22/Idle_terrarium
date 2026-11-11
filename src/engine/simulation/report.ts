import { findCatalogDef } from '@/data/catalog'
import type { StudioState } from '@/store/useStudioStore'
import type { EngineWorld } from '../world'
import { LIFE, lifePace, lightDose, type EventKind, type LifeEvent } from './life'
import { phaseAt } from './phases'

/** One line of an away report: a kind of event for one species, with how many times it happened. */
export interface ReportItem {
  kind: EventKind
  /** The first plant that had the event. */
  uid: string
  id: string
  text: string
  count: number
}

/** What the garden will do next: `eta` is in tank days. */
export interface Hint {
  uid: string
  text: string
  eta: number
}

/** One catch-up (or preview, or day-change) summary shown on the time-away card and kept in the journal. */
export interface AwayReport {
  from: number
  to: number
  /** Real hours away. */
  hours: number
  /** Tank hours that passed (capped by the catch-up limit). */
  tankHours: number
  capped: boolean
  mode: 'away' | 'preview' | 'day'
  reason: string
  items: ReportItem[]
  /** Events left out of `items`. */
  more: number
  /** Names of plants that went to rest. */
  rest: string[]
  hints: Hint[]
}

/** Kinds worth showing to the player; the rest are folded away or mentioned in passing. */
export const NOTABLE: Record<EventKind, 0 | 1> = {
  open: 1,
  seedling: 1,
  hatch: 1,
  frond: 1,
  bud: 1,
  spread: 1,
  tendril: 1,
  grown: 1,
  fiddle: 0,
  fade: 0,
  rest: 0,
  seed: 0,
}

/** Most interesting first. */
export const EVENT_ORDER: EventKind[] = [
  'open',
  'seedling',
  'hatch',
  'frond',
  'bud',
  'spread',
  'tendril',
  'grown',
  'fiddle',
  'fade',
  'rest',
]

/** Dot colour per event kind, for canvas rings and the card's list dots. */
export const DOT_COLOURS: Record<string, string> = {
  open: '#e8a0b8',
  bud: '#d9b3c4',
  fade: '#b9a7a0',
  seedling: '#8fc47a',
  grown: '#6fae62',
  fiddle: '#a7cf8a',
  frond: '#7fbf7a',
  tendril: '#9bc58a',
  spread: '#86b57d',
  hatch: '#e5c06a',
  rest: '#93a4b8',
  default: '#9fb59a',
}

function speciesName(id: string): string {
  return findCatalogDef(id)?.name ?? id
}

const EVENT_TEXT: Partial<Record<EventKind, (name: string, bloom: string) => string>> = {
  bud: (n) => `The ${n} is forming buds.`,
  open: (n, bloom) => `The ${n} opened ${bloom}.`,
  fade: (n) => `The ${n}'s flowers faded.`,
  seedling: (n) => `A ${n} seedling came up.`,
  fiddle: (n) => `The ${n} is unfurling a new frond.`,
  frond: (n) => `The ${n} put out a new frond.`,
  tendril: (n) => `The ${n} sent out a runner.`,
  spread: (n) => `The ${n} spread a little.`,
  grown: (n) => `The ${n} seedling filled out.`,
  hatch: (n) => `The ${n} had young.`,
}

/** The sentence for one event; kinds without copy (`seed`, `rest`) give ''. */
export function eventText(kind: EventKind, id: string): string {
  const make = EVENT_TEXT[kind]
  return make ? make(speciesName(id), LIFE[id]?.bloom ?? 'flowers') : ''
}

/** Lines shown on the card when there is no rest line, and when there is one. */
const LINES = 4
const LINES_WITH_REST = 3

/** Turns raw life events into the card's lines: deduped, grouped, ordered and trimmed. */
export function buildReport(
  events: LifeEvent[],
  restNames: string[],
): Pick<AwayReport, 'items' | 'more' | 'rest'> {
  const opened = new Set<string>()
  const fronded = new Set<string>()
  for (const e of events) {
    if (e.kind === 'open') opened.add(e.uid)
    else if (e.kind === 'frond') fronded.add(e.uid)
  }
  const groups = new Map<string, ReportItem>()
  for (const e of events) {
    if (!EVENT_TEXT[e.kind]) continue
    if (e.kind === 'bud' && opened.has(e.uid)) continue
    if (e.kind === 'fiddle' && fronded.has(e.uid)) continue
    const key = `${e.kind}|${e.id}`
    const found = groups.get(key)
    if (found) found.count++
    else
      groups.set(key, {
        kind: e.kind,
        uid: e.uid,
        id: e.id,
        text: eventText(e.kind, e.id),
        count: 1,
      })
  }
  const byKind = EVENT_ORDER.map((k) => [...groups.values()].filter((g) => g.kind === k))
  const ordered = [
    ...byKind.flatMap((list) => list.slice(0, 1)),
    ...byKind.flatMap((list) => list.slice(1)),
  ]
  const limit = restNames.length ? LINES_WITH_REST : LINES
  return {
    items: ordered.slice(0, limit),
    more: Math.max(0, ordered.length - limit),
    rest: restNames,
  }
}

/** The "slowed down to rest" line; the card shows it after the event lines. */
export function restLine(names: string[]): string {
  return `The ${names.slice(0, 2).join(' and ')} slowed down to rest. A mist or a drink will wake ${
    names.length === 1 ? 'it' : 'them'
  }.`
}

/** The nearest `open` first, then the soonest other step; one hint per species. */
export function upcomingHints(
  world: EngineWorld,
  state: Pick<StudioState, 'hasGrowLamp'>,
  limit = 2,
): Hint[] {
  const dose = lightDose(state)
  const best = new Map<string, Hint & { open: boolean }>()
  for (const item of world.items) {
    const def = LIFE[item.id]
    const life = item.life
    if (!def || !life || item.baby !== undefined) continue
    const pace = lifePace(item, dose)
    if (pace <= 0) continue
    const phase = phaseAt(def.kind, life.cyc)
    const hint = {
      uid: item.uid,
      text: `${speciesName(item.id)}: ${phase.next}`,
      eta: (Math.max(0, phase.to - life.cyc) * def.days) / pace,
      open: def.kind === 'bloom' && phase.name === 'In bud',
    }
    const held = best.get(item.id)
    if (!held || (hint.open && !held.open) || (hint.open === held.open && hint.eta < held.eta))
      best.set(item.id, hint)
  }
  const all = [...best.values()].sort((a, b) => a.eta - b.eta)
  const open = all.find((h) => h.open)
  const picked = open ? [open, ...all.filter((h) => h !== open)] : all
  return picked.slice(0, limit).map(({ uid, text, eta }) => ({ uid, text, eta }))
}

/** "30 min", "5 h", "2 days". */
export function durationLabel(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`
  if (hours < 36) return `${Math.round(hours)} h`
  return `${Math.round(hours / 24)} days`
}

const pad2 = (n: number): string => String(n).padStart(2, '0')

function clock(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

/** "today at 09:05", "last night at 18:20", "yesterday at 10:00" or "Sunday at 08:00", in local time. */
export function sinceLabel(ts: number, now: number = Date.now()): string {
  const d = new Date(ts)
  const today = new Date(now)
  const sameDay = (a: Date, b: Date): boolean =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  if (sameDay(d, today)) return `today at ${clock(d)}`
  const eve = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
  if (sameDay(d, eve)) return `${d.getHours() >= 17 ? 'last night' : 'yesterday'} at ${clock(d)}`
  return `${d.toLocaleDateString('en-US', { weekday: 'long' })} at ${clock(d)}`
}

/** How long until something happens, in real time at the given pace (ms per tank day). */
export function etaLabel(days: number, paceMs: number): string {
  const ms = days * paceMs
  if (ms < 90e3) return 'in a minute or so'
  if (ms < 36e5) return `in about ${Math.round(ms / 60e3)} min`
  const hours = ms / 36e5
  if (hours < 36)
    return `in about ${hours < 10 ? Math.round(hours * 10) / 10 : Math.round(hours)} h`
  return `in about ${Math.round(hours / 24)} days`
}
