/** One-click care actions offered by the care report. */
import type { CareActionId } from '@/data/care'
import type { Store } from 'jotai'
import {
  cycleProgressAtom,
  hardwareAtoms,
  mineralSpotsAtom,
  pumpFlowAtom,
  roomAtom,
  setSubstrateAtom,
  substratesAtom,
  waterSplitAtom,
} from '@/store/studio'
import { wakeResting, wokeToast } from '../simulation/ecology'
import type { EngineWorld } from '../world'

/**
 * Applies a one-click care action and returns the toast text. Engine gauges live on `world.env`;
 * hardware and build settings are written to the studio atoms in `store`. The UI caller plays the feed chime.
 */
export function runCareAction(world: EngineWorld, store: Store, id: CareActionId): string {
  const env = world.env
  switch (id) {
    case 'mist': {
      env.mistBoost = Math.min(25, env.mistBoost + 10)
      env.soilMoisture = Math.min(98, env.soilMoisture + 4)
      const woke = wakeResting(world)
      return woke.length ? `Misted the plants. ${wokeToast(woke)}` : 'Misted the plants'
    }
    case 'openLid':
      store.set(hardwareAtoms.hasLid, false)
      return 'Lid cracked open to vent moisture'
    case 'closeLid':
      store.set(hardwareAtoms.hasLid, true)
      return 'Lid sealed; humidity will rise'
    case 'fogOff':
      store.set(hardwareAtoms.hasFogger, false)
      return 'Fogger off'
    case 'pumpGentle':
      store.set(pumpFlowAtom, 'gentle')
      return 'Pump set to gentle flow'
    case 'feed':
      env.nutrients = Math.min(100, env.nutrients + 15)
      return 'Added organic bio-feed'
    case 'widenPool': {
      // Substrates are read before the writes (the old store snapshot); setWaterSplit does not touch them.
      const water = store.get(substratesAtom).water
      store.set(waterSplitAtom, 0.3)
      store.set(setSubstrateAtom, 'water', Math.max(water || 0, 40))
      store.set(cycleProgressAtom, 0)
      env.cycleProgress = 0
      return 'Added a pool. New water cycles for about 3 weeks.'
    }
    case 'waterTreat':
      store.set(roomAtom, { water: 'tap_treated' })
      return 'Water is now dechlorinated'
    case 'waterRO':
      store.set(roomAtom, { water: 'ro' })
      return 'Misting with RO water now'
    case 'airClean':
      store.set(roomAtom, { air: 'clean' })
      return 'Tank moved to a room with clean air'
    case 'purifierOn':
      store.set(roomAtom, { purifier: true })
      return 'Air purifier on'
    case 'wipeGlass':
      // The engine owns the live value; zero both so the next flush does not restore the old spots.
      world.mineralSpots = 0
      store.set(mineralSpotsAtom, 0)
      return 'Glass wiped clean'
  }
}
