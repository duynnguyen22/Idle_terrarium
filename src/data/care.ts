export type CareActionId =
  | 'mist'
  | 'openLid'
  | 'closeLid'
  | 'fogOff'
  | 'pumpGentle'
  | 'feed'
  | 'widenPool'
  | 'waterTreat'
  | 'waterRO'
  | 'airClean'
  | 'purifierOn'
  | 'wipeGlass'

export interface CareIssue {
  level: 'warn' | 'info'
  species?: string[]
  text: string
  action?: { id: CareActionId; label: string }
}
