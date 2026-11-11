import { useEffect, type RefObject } from 'react'
import { ALL_CATALOG_DEFS, type CatalogId } from '@/data/catalog'
import { vesselKX } from '@/data/vessels'
import {
  commitWorld,
  isOwnSnapshot,
  tryGetWorld,
  registerWorld,
  unregisterWorld,
} from '@/engine/engineBridge'
import { seedWorldEnv } from '@/engine/envSeed'
import { seedInitialScene } from '@/engine/presets'
import { ecoTimeFromDayCount, restoreWorld } from '@/engine/persistence'
import { computeVesselRect, renderFrame } from '@/engine/render/renderFrame'
import { flushEnvSeed, flushTelemetry } from '@/engine/simulation/telemetry'
import { tick } from '@/engine/simulation/tick'
import { warmSpriteCache } from '@/engine/sprites/spriteCache'
import { createWorld, type EngineWorld } from '@/engine/world'
import { play } from '@/hooks/useAudio'
import { showToast } from '@/store/toastStore'
import { useStudioStore } from '@/store/useStudioStore'
import { useTelemetryStore } from '@/store/useTelemetryStore'

/** Longest simulated step; a backgrounded tab resumes with a clamped dt instead of a huge jump. */
const MAX_DT_MS = 100
const MAX_DPR = 2

declare global {
  interface Window {
    /** Dev/e2e debug handle; only present when `import.meta.env.DEV` (Playwright runs the dev server). */
    __botanica?: {
      world: () => EngineWorld
      store: typeof useStudioStore
      telemetry: typeof useTelemetryStore
    }
  }
}

/**
 * Owns the EngineWorld and the single rAF loop for `canvasRef`. The hot path reads the store via
 * `getState()` once per frame and never writes to it. The canvas backing size is owned by the component.
 */
export function useTerrariumEngine(canvasRef: RefObject<HTMLCanvasElement | null>): void {
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const world = createWorld()
    seedWorldEnv(world, useStudioStore.getState())
    const initial = useStudioStore.getState().worldSnapshot
    const dayCount = useStudioStore.getState().dayCount
    world.ecoTime = ecoTimeFromDayCount(dayCount)
    if (initial) restoreWorld(world, initial, dayCount)
    registerWorld(world)
    seedInitialScene(world)
    if (import.meta.env.DEV)
      window.__botanica = {
        world: () => world,
        store: useStudioStore,
        telemetry: useTelemetryStore,
      }
    warmSpriteCache(ALL_CATALOG_DEFS.map((d) => d.id as CatalogId))

    // External snapshot changes (e.g. a preset load) replace the world's persistable parts;
    // snapshots the bridge wrote itself are skipped so mid-interaction item objects are not replaced.
    const unsubscribe = useStudioStore.subscribe((s, prev) => {
      if (
        s.worldSnapshot &&
        s.worldSnapshot !== prev.worldSnapshot &&
        !isOwnSnapshot(s.worldSnapshot)
      )
        restoreWorld(world, s.worldSnapshot, s.dayCount)
    })

    let rafId = 0
    let last = 0

    const frame = (timestamp: number) => {
      rafId = requestAnimationFrame(frame)
      const dt = Math.min(timestamp - (last || timestamp), MAX_DT_MS)
      last = timestamp

      const state = useStudioStore.getState()
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
    }

    const start = () => {
      if (rafId) return
      last = 0
      rafId = requestAnimationFrame(frame)
    }
    const stop = () => {
      if (!rafId) return
      cancelAnimationFrame(rafId)
      rafId = 0
    }
    const saveNow = () => {
      const s = useStudioStore.getState()
      // Push the latest day count and cycle progress now, not up to 250 ms late.
      flushTelemetry(world, s)
      flushEnvSeed(world, s)
      commitWorld()
      s.setLastSimulatedAt(Date.now())
    }
    const onVisibility = () => {
      if (document.hidden) {
        stop()
        saveNow()
      } else {
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
      unregisterWorld()
      if (import.meta.env.DEV) delete window.__botanica
    }
  }, [canvasRef])
}
