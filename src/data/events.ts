export type EventKind =
  | 'bud'
  | 'open'
  | 'fade'
  | 'seed'
  | 'fiddle'
  | 'frond'
  | 'tendril'
  | 'spread'
  | 'seedling'
  | 'grown'
  | 'hatch'
  | 'eaten'
  | 'rest'

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

/** Most away reports kept in the persisted log. */
export const AWAY_LOG_MAX = 12
