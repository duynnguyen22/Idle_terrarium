/** What the care report reads: the build settings plus the live gauges. */
import type { PlacedItem } from '@/data/types'
import type { StudioState } from '@/store/studio'

export type CareInputs = Pick<
  StudioState,
  'hasLid' | 'hasFogger' | 'pumpFlow' | 'vessel' | 'waterSplit' | 'substrates' | 'room'
> & {
  items: readonly PlacedItem[]
  humidity: number
  temperature: number
  soilMoisture: number
  nutrients: number
  condensation: number
  cycleProgress: number
  /** Hard-water residue on the glass, 0 to 1 (lives on the engine world). */
  mineralSpots: number
}
