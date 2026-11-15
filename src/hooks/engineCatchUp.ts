import { commitWorld, onWorldRestored } from '@/engine/engineBridge'
import { runCatchUpIfDue } from '@/engine/simulation/catchup'
import type { EngineWorld } from '@/engine/world'
import { recordReport } from '@/services/awayFlow'
import { phaseAtom } from '@/services/account'
import { appStore } from '@/store/appStore'
import { awayIndexAtom } from '@/store/overlay'
import { lastSimulatedAtAtom } from '@/store/studio'

/** The time-away catch-up for one engine world, and the subscriptions that trigger it. */
export interface EngineCatchUp {
  /** Runs the catch-up now, or once the account check has settled. */
  catchUpWhenSettled: () => void
  unsubscribeAccount: () => void
  offRestored: () => void
}

/**
 * Starts the time-away catch-up for `world`: runs it now (or once the account check settles), and again
 * after a saved garden replaces the world. The caller runs it on each return to the tab and calls the two
 * unsubscribe functions on cleanup.
 */
export function startCatchUp(world: EngineWorld): EngineCatchUp {
  // Time away: catch the tank up on load, after a saved garden replaces it, and on each return to the tab,
  // outside the rAF frame.
  const catchUp = () => {
    try {
      const r = runCatchUpIfDue(world, appStore, Date.now())
      if (r) {
        recordReport(r, { journal: true })
        // Persist the caught-up world alongside the already-advanced lastSimulatedAt.
        commitWorld()
      }
    } catch (e) {
      // Never block the engine: skip this gap instead of retrying it on every reload.
      console.error('Catch-up failed', e)
      appStore.set(lastSimulatedAtAtom, Date.now())
    }
  }
  // While the account check runs, sign-in may still replace this garden with a saved one, so the catch-up
  // waits for the phase to settle and then runs against whichever garden is in place.
  let catchUpPending = false
  const catchUpWhenSettled = () => {
    if (appStore.get(phaseAtom) === 'checking') catchUpPending = true
    else catchUp()
  }
  // Pending is only set while the phase is 'checking', so leaving it is always a phase change.
  const unsubscribeAccount = appStore.sub(phaseAtom, () => {
    if (!catchUpPending || appStore.get(phaseAtom) === 'checking') return
    catchUpPending = false
    catchUp()
  })
  const offRestored = onWorldRestored(() => {
    // An open card showed the previous garden's log; the applied one reopens it only for its own gap.
    appStore.set(awayIndexAtom, null)
    catchUpWhenSettled()
  })
  catchUpWhenSettled()
  return { catchUpWhenSettled, unsubscribeAccount, offRestored }
}
