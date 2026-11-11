import type { EngineWorld } from './world'

export const PING_MS = 2600
export const TOUR_PING_MS = 4200

/** Replaces the dashed rings drawn around items. */
export function setRings(world: EngineWorld, uids: string[]): void {
  world.marks.rings = [...uids]
}

export function clearRings(world: EngineWorld): void {
  world.marks.rings = []
}

/** Pulses a ring around `uid` for `ms`; `now` is on the render clock (performance.now / rAF time). */
export function pingItem(
  world: EngineWorld,
  uid: string,
  ms: number,
  now: number = performance.now(),
): void {
  world.marks.pings.set(uid, now + ms)
}

/** Uids still pinging at `now`; expired entries are dropped. */
export function activePings(world: EngineWorld, now: number): string[] {
  const live: string[] = []
  for (const [uid, until] of world.marks.pings) {
    if (until > now) live.push(uid)
    else world.marks.pings.delete(uid)
  }
  return live
}
