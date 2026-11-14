import { useEffect, type RefObject } from 'react'
import { ALL_CATALOG_DEFS, type CatalogId } from '@/data/catalog'
import { vesselKX } from '@/data/vessels'
import {
  commitWorld,
  isOwnSnapshot,
  onWorldRestored,
  tryGetWorld,
  registerWorld,
  unregisterWorld,
} from '@/engine/engineBridge'
import { seedWorldEnv } from '@/engine/envSeed'
import { seedInitialScene } from '@/engine/presets'
import { ecoTimeFromDayCount, restoreWorld } from '@/engine/persistence'
import { createPerf, perfSummary, sampleFrame } from '@/engine/render/perf'
import { computeVesselRect, renderFrame } from '@/engine/render/renderFrame'
import { runCatchUpIfDue } from '@/engine/simulation/catchup'
import { flushEnvSeed, flushTelemetry } from '@/engine/simulation/telemetry'
import { tick } from '@/engine/simulation/tick'
import { warmSpriteCache } from '@/engine/sprites/spriteCache'
import { createWorld, type EngineWorld } from '@/engine/world'
import { play } from '@/hooks/useAudio'
import { recordReport } from '@/store/awayFlow'
import { phaseAtom } from '@/store/account'
import { appStore, type AppStore } from '@/store/appStore'
import { awayIndexAtom } from '@/store/overlay'
import {
  dayCountAtom,
  lastSimulatedAtAtom,
  studioStateAtom,
  worldSnapshotAtom,
} from '@/store/studio'
import { showToast } from '@/store/toast'
import { perfHudAtom, perfTextAtom, smoothDrawingAtom } from '@/store/view'

/** Longest simulated step; a backgrounded tab resumes with a clamped dt instead of a huge jump. */
const MAX_DT_MS = 100
const MAX_DPR = 2

declare global {
  interface Window {
    /** Dev/e2e debug handle; only present when `import.meta.env.DEV` (Playwright runs the dev server). */
    __botanica?: {
      world: () => EngineWorld
      /** The app's jotai store (studio, telemetry, overlay and account atoms). */
      store: AppStore
    }
  }
}

/**
 * Owns the EngineWorld and the single rAF loop for `canvasRef`. The hot path reads the studio state
 * once per frame for rendering. The canvas backing size is owned by the component.
 */
export function useTerrariumEngine(canvasRef: RefObject<HTMLCanvasElement | null>): void {
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const world = createWorld()
    seedWorldEnv(world, appStore.get(studioStateAtom))
    const initial = appStore.get(worldSnapshotAtom)
    const dayCount = appStore.get(dayCountAtom)
    world.ecoTime = ecoTimeFromDayCount(dayCount)
    if (initial) restoreWorld(world, initial, dayCount)
    registerWorld(world)
    seedInitialScene(world)
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
    if (import.meta.env.DEV)
      window.__botanica = {
        world: () => world,
        store: appStore,
      }
    warmSpriteCache([...ALL_CATALOG_DEFS.map((d) => d.id as CatalogId), 'bumblebee_millipede_curl'])

    // External snapshot changes (e.g. a preset load) replace the world's persistable parts;
    // snapshots the bridge wrote itself are skipped so mid-interaction item objects are not replaced.
    let prevSnapshot = appStore.get(worldSnapshotAtom)
    const unsubscribe = appStore.sub(worldSnapshotAtom, () => {
      const snap = appStore.get(worldSnapshotAtom)
      const prev = prevSnapshot
      prevSnapshot = snap
      if (snap && snap !== prev && !isOwnSnapshot(snap))
        restoreWorld(world, snap, appStore.get(dayCountAtom))
    })

    let rafId = 0
    let last = 0
    const perf = createPerf()

    const frame = (timestamp: number) => {
      rafId = requestAnimationFrame(frame)
      const dt = Math.min(timestamp - (last || timestamp), MAX_DT_MS)
      last = timestamp
      sampleFrame(perf, timestamp)

      // Read before tick: this frame renders the state the frame started with.
      const state = appStore.get(studioStateAtom)
      tick(world, dt, timestamp, { onCue: play, onToast: showToast, commit: commitWorld })
      if (world.pourSettled) {
        // Pointer-up committed before the last particles landed; commit once more outside the frame.
        world.pourSettled = false
        queueMicrotask(() => {
          if (tryGetWorld() === world) commitWorld()
        })
      }

      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
      const W = canvas.width / dpr
      const H = canvas.height / dpr
      if (W <= 0 || H <= 0) return

      ctx.save()
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      const R = computeVesselRect(W, H, state.relaxMode, vesselKX(state.vessel))
      renderFrame(ctx, world, state, R, timestamp, { w: W, h: H })
      ctx.restore()

      if (world.frame % 20 === 0 && appStore.get(perfHudAtom)) {
        const sum = perfSummary(perf)
        if (sum) {
          const smooth = appStore.get(smoothDrawingAtom) ? 'on' : 'off'
          appStore.set(
            perfTextAtom,
            `${sum.fps} fps · slowest ${sum.slowest} ms · ${canvas.width}×${canvas.height} · detail 100% · smooth ${smooth}`,
          )
        }
      }
    }

    const start = () => {
      if (rafId) return
      last = 0
      perf.last = 0
      rafId = requestAnimationFrame(frame)
    }
    const stop = () => {
      if (!rafId) return
      cancelAnimationFrame(rafId)
      rafId = 0
    }
    const saveNow = () => {
      // Push the latest day count and cycle progress now, not up to 250 ms late.
      flushTelemetry(world, appStore)
      flushEnvSeed(world, appStore)
      commitWorld()
      appStore.set(lastSimulatedAtAtom, Date.now())
    }
    const onVisibility = () => {
      if (document.hidden) {
        stop()
        saveNow()
      } else {
        catchUpWhenSettled()
        start()
      }
    }

    document.addEventListener('visibilitychange', onVisibility)
    if (!document.hidden) start()

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      stop()
      saveNow()
      unsubscribe()
      unsubscribeAccount()
      offRestored()
      unregisterWorld()
      if (import.meta.env.DEV) delete window.__botanica
    }
  }, [canvasRef])
}
