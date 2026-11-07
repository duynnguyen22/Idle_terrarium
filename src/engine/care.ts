/** Care report types. Type-only for now; the care report functions land in a later task. */

export type CareActionId =
  | 'mist'
  | 'openLid'
  | 'closeLid'
  | 'fogOff'
  | 'pumpGentle'
  | 'feed'
  | 'widenPool'

export interface CareIssue {
  level: 'warn' | 'info'
  species?: string[]
  text: string
  action?: { id: CareActionId; label: string }
}
