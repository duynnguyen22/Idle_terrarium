import type { LifeKind } from './life'

export interface Phase {
  /** Start of the phase as a fraction of the cycle (inclusive). */
  from: number
  /** End of the phase as a fraction of the cycle (exclusive, except the last phase). */
  to: number
  name: string
  /** What happens when the phase ends, worded to follow "next:". */
  next: string
}

/** Named stretches of each life-cycle kind, shared by the "what comes next" hints and the Growth board. */
export const PHASES: Record<LifeKind, Phase[]> = {
  bloom: [
    { from: 0, to: 0.5, name: 'Leafy growth', next: 'buds form' },
    { from: 0.5, to: 0.68, name: 'In bud', next: 'buds open' },
    { from: 0.68, to: 0.9, name: 'Flowering', next: 'petals fade' },
    { from: 0.9, to: 1, name: 'Setting seed', next: 'a new cycle starts' },
  ],
  frond: [
    { from: 0, to: 0.55, name: 'Growing', next: 'a new frond appears' },
    { from: 0.55, to: 1, name: 'Unfurling a frond', next: 'the frond opens' },
  ],
  shoot: [{ from: 0, to: 1, name: 'Growing a runner', next: 'the runner reaches out' }],
  moss: [{ from: 0, to: 1, name: 'Creeping', next: 'it spreads a little' }],
}

/** The phase containing `cyc`; the last phase once `cyc` reaches 1. */
export function phaseAt(kind: LifeKind, cyc: number): Phase {
  const list = PHASES[kind]
  return list.find((p) => cyc >= p.from && cyc < p.to) ?? list[list.length - 1]
}
